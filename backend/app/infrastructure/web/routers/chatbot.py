import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.infrastructure.logging.audit import log_chat_message
from app.infrastructure.services.llm_service import llm_service

_limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/chat", tags=["chatbot"])
logger = logging.getLogger(__name__)


_SYSTEM_BASE = """\
You are Q-Bot, the AI health assistant embedded in Q-Med, a personal health
monitoring application that uses rPPG, heart-sound analysis, stress inference,
and blood-pressure estimation via smartphone signals.

## YOUR ROLE
- Answer general health questions.
- Help users understand their Q-Med measurement results.
- Explain metrics in plain language.
- Give evidence-based general wellness advice.
- Answer questions about how to use Q-Med features.
- Always remind users to consult a doctor for diagnosis or treatment decisions.

## METRICS YOU UNDERSTAND
- Heart rate (BPM): current resting heart rate.
- Stress level (0-100): physiological stress index.
- HRV / RMSSD (ms): heart rate variability.
- Blood pressure (mmHg): systolic/diastolic readings.
- Heart sound rhythm: normal/abnormal classification from the heartbeat model.

## NORMAL RANGES
- Heart rate: 60-100 BPM resting
- Stress: 0-39 low | 40-69 moderate | 70-100 high
- Blood pressure: <120/80 normal | 120-129/80 elevated | >=130/80 high
- HRV (RMSSD): >50ms good | 20-50ms average | <20ms low

## HARD LIMITS
- Do not diagnose diseases or name specific conditions definitively.
- Do not recommend prescription medications or dosages.
- Always advise seeing a qualified physician for anything clinical.
- Refuse only if the topic is unrelated to health, medicine, body, or wellness.
"""

_LANG_INSTRUCTION = {
    "vi": (
        "Tra loi hoan toan bang tieng Viet, than thien va chuyen nghiep. "
        "Khi tu choi: 'Xin loi, toi chi ho tro cac cau hoi ve Q-Med va suc khoe.'"
    ),
    "en": (
        "Reply entirely in English, friendly and professional. "
        "When refusing: 'Sorry, I can only assist with Q-Med and health-related questions.'"
    ),
}


def _format_vitals(vitals: Optional[Dict[str, Any]]) -> str:
    if not vitals:
        return ""

    parts = []
    if vitals.get("hr_bpm"):
        parts.append(f"Heart rate: {vitals['hr_bpm']} BPM")
    if vitals.get("stress_level") is not None:
        parts.append(f"Stress level: {vitals['stress_level']}/100")
    if vitals.get("hrv_ms"):
        parts.append(f"HRV (RMSSD): {vitals['hrv_ms']} ms")

    bpv = vitals.get("blood_pressure", {})
    if bpv and bpv.get("systolic"):
        parts.append(
            f"Blood pressure: {bpv['systolic']}/{bpv.get('diastolic', '?')} mmHg"
        )

    return ", ".join(parts)


def _format_profile(profile: Optional[Dict[str, Any]]) -> str:
    if not profile:
        return ""

    parts = []
    if profile.get("birth_year"):
        age = datetime.now().year - profile["birth_year"]
        parts.append(f"Age: {age}")
    if profile.get("gender"):
        parts.append(f"Gender: {profile['gender']}")
    if profile.get("height_cm") and profile.get("weight_kg"):
        bmi = profile["weight_kg"] / (profile["height_cm"] / 100) ** 2
        parts.append(f"BMI: {bmi:.1f}")
    if profile.get("exercise"):
        parts.append(f"Exercise: {profile['exercise']}")
    if profile.get("current_medications"):
        parts.append(f"Notes/medications: {profile['current_medications']}")

    return ", ".join(parts)


def build_system_prompt(
    language: str = "vi",
    vitals: Optional[Dict[str, Any]] = None,
    profile: Optional[Dict[str, Any]] = None,
) -> str:
    lang = language if language in _LANG_INSTRUCTION else "vi"
    prompt = _SYSTEM_BASE

    vitals_str = _format_vitals(vitals)
    profile_str = _format_profile(profile)

    if vitals_str or profile_str:
        prompt += "\n\n## USER CONTEXT FROM Q-MED APP"
        if profile_str:
            prompt += f"\n- Profile: {profile_str}"
        if vitals_str:
            prompt += f"\n- Latest measurements: {vitals_str}"

    prompt += f"\n\nLANGUAGE: {_LANG_INSTRUCTION[lang]}"
    return prompt


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: Optional[str] = "vi"
    vitals: Optional[Dict[str, Any]] = None
    health_profile: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    model: str


@router.post("/message", response_model=ChatResponse)
@_limiter.limit("10/minute")
async def chat_message(request: Request, body: ChatRequest):
    try:
        system_prompt = build_system_prompt(
            language=body.language or "vi",
            vitals=body.vitals,
            profile=body.health_profile,
        )
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        raw_history = [
            {"role": "user" if m.role == "user" else "assistant", "content": m.content}
            for m in (body.history or [])
        ]
        while raw_history and raw_history[0]["role"] != "user":
            raw_history.pop(0)

        sanitized: List[Dict[str, str]] = []
        for msg in raw_history:
            if sanitized and sanitized[-1]["role"] == msg["role"]:
                sanitized[-1]["content"] += "\n" + msg["content"]
            else:
                sanitized.append(msg)

        messages.extend(sanitized)
        if messages and messages[-1]["role"] == "user":
            messages[-1]["content"] += "\n" + body.message
        else:
            messages.append({"role": "user", "content": body.message})

        client_ip = request.client.host if request.client else "-"
        log_chat_message(
            user_id=None,
            language=body.language or "vi",
            has_vitals=body.vitals is not None,
            ip=client_ip,
        )
        logger.info(
            "Chat request start: anonymous lang=%s has_vitals=%s ip=%s",
            body.language,
            body.vitals is not None,
            client_ip,
        )

        reply_text = await llm_service.generate_response(
            messages=messages,
            max_new_tokens=1024,
            temperature=0.65,
        )
        logger.info(
            "Chat request done: anonymous tokens=%d ip=%s",
            len(reply_text.split()),
            client_ip,
        )
        return ChatResponse(reply=reply_text, model=llm_service.model_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chatbot error: %s", e)
        if llm_service.model is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "AI model is still starting. Please try again in a moment."
                    if llm_service.is_loading
                    else "AI model is unavailable. Check backend logs and available disk space."
                ),
            )
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")


@router.get("/health")
def chatbot_health():
    model = llm_service.model
    is_loaded = model is not None
    device = str(getattr(model, "device", "unknown")) if is_loaded else "unknown"
    status = "ready" if is_loaded else "loading" if llm_service.is_loading else "unavailable"
    return {
        "status": status,
        "model": llm_service.model_id,
        "device": device,
        "error": llm_service.load_error,
    }
