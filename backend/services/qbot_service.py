from __future__ import annotations

from typing import Any


def build_qbot_reply(message: str, records: list[dict[str, Any]]) -> str:
    lower = message.lower()
    latest = records[0] if records else None

    if not message.strip():
        return "Anh hãy nhập câu hỏi để Q-Bot hỗ trợ nhé."

    if "history" in lower or "lich su" in lower or "lịch sử" in lower:
        if not records:
            return "Hiện chưa có lịch sử đo trên backend. Anh hãy đo thử một chỉ số trước."

        value = f"{latest['primaryValue']} {latest.get('primaryUnit') or ''}".strip()
        return (
            f"Backend đang lưu {len(records)} kết quả. "
            f"Kết quả mới nhất là {latest['type']}: {value}."
        )

    if "stress" in lower or "căng thẳng" in lower:
        return "Stress screen ước tính mức căng thẳng từ tín hiệu sinh học. Khi có model thật, backend sẽ thay phần demo bằng inference."

    if "huyết áp" in lower or "blood" in lower or "pressure" in lower:
        return "Blood Pressure screen trả về systolic, diastolic và pulse. Kết quả hiện là demo, chưa dùng để chẩn đoán y tế."

    if "tim" in lower or "heart" in lower or "heartbeat" in lower:
        return "Heartbeat screen theo dõi nhịp tim và độ tin cậy tín hiệu. Anh nên đo ở nơi yên tĩnh và giữ thiết bị ổn định."

    if "rppg" in lower or "camera" in lower:
        return "Face rPPG dùng camera RGB để đọc thay đổi màu rất nhỏ trên da, từ đó ước tính nhịp tim và HRV."

    if "model" in lower or "ai" in lower:
        return "Hiện backend có AI engine demo để giữ đúng flow. Khi tìm lại checkpoint thật, chỉ cần thay logic trong services/ai_engine.py."

    return "Q-Bot backend đã nhận câu hỏi. Hiện em có thể hỗ trợ về Face rPPG, Stress, Blood Pressure, Heartbeat, AI model và lịch sử đo."
