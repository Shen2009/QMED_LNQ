"""
audit.py — Centralized audit logging for Q-Med backend.

Ghi lại các sự kiện quan trọng:
  - AUTH: đăng nhập, đăng ký, thất bại
  - DATA: lưu kết quả đo, cập nhật hồ sơ sức khoẻ
  - INFERENCE: gọi AI chat, phân tích rPPG

Log format: "AUDIT event=<event> user_id=<id> ip=<ip> detail=<detail>"
Tên logger: "qmed.audit" — có thể redirect sang file riêng qua logging config.
"""
import logging

audit = logging.getLogger("qmed.audit")


# ── Auth events ───────────────────────────────────────────────────────────────

def log_register(user_id: int, email: str, ip: str) -> None:
    audit.info(
        "AUDIT event=REGISTER user_id=%d email=%s ip=%s",
        user_id, email, ip,
    )


def log_login_success(user_id: int, email: str, ip: str) -> None:
    audit.info(
        "AUDIT event=LOGIN_SUCCESS user_id=%d email=%s ip=%s",
        user_id, email, ip,
    )


def log_login_failed(email: str, ip: str, reason: str = "") -> None:
    audit.warning(
        "AUDIT event=LOGIN_FAILED email=%s ip=%s reason=%s",
        email, ip, reason,
    )


# ── Data mutation events ──────────────────────────────────────────────────────

def log_history_save(user_id: int, measurement_type: str, record_id: int) -> None:
    audit.info(
        "AUDIT event=HISTORY_SAVE user_id=%d type=%s record_id=%d",
        user_id, measurement_type, record_id,
    )


def log_profile_upsert(user_id: int, is_new: bool) -> None:
    action = "PROFILE_CREATE" if is_new else "PROFILE_UPDATE"
    audit.info(
        "AUDIT event=%s user_id=%d",
        action, user_id,
    )


# ── Inference events ──────────────────────────────────────────────────────────

def log_rppg_analyse(user_id: int | None, filename: str, ip: str, success: bool) -> None:
    audit.info(
        "AUDIT event=RPPG_ANALYSE user_id=%s file=%s ip=%s success=%s",
        user_id, filename, ip, success,
    )


def log_chat_message(user_id: int | None, language: str, has_vitals: bool, ip: str) -> None:
    audit.info(
        "AUDIT event=CHAT_MESSAGE user_id=%s lang=%s has_vitals=%s ip=%s",
        user_id, language, has_vitals, ip,
    )


def log_scg_analyse(ip: str, n_samples: int, success: bool) -> None:
    audit.info(
        "AUDIT event=SCG_ANALYSE ip=%s n_samples=%d success=%s",
        ip, n_samples, success,
    )


def log_sleep_assess(ip: str, n_samples: int, success: bool) -> None:
    audit.info(
        "AUDIT event=SLEEP_ASSESS ip=%s n_samples=%d success=%s",
        ip, n_samples, success,
    )


def log_heartbeat_analyse(ip: str, filename: str, success: bool) -> None:
    audit.info(
        "AUDIT event=HEARTBEAT_ANALYSE ip=%s file=%s success=%s",
        ip, filename, success,
    )

def log_stress_analyse(user_id: int | None, video_path: str, ip: str, success: bool, stress_score: float | None = None) -> None:
    audit.info(
        "AUDIT event=STRESS_ANALYSE user_id=%s video=%s ip=%s success=%s score=%s",
        user_id, video_path, ip, success, stress_score,
    )


def log_bp_analyse(user_id: int | None, filename: str, ip: str, success: bool) -> None:
    audit.info(
        "AUDIT event=BP_ANALYSE user_id=%s file=%s ip=%s success=%s",
        user_id, filename, ip, success,
    )
