import os
from datetime import datetime, timedelta
try:
    from zoneinfo import ZoneInfo
    VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
except ImportError:
    from datetime import timezone
    VN_TZ = timezone(timedelta(hours=7))
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt as _bcrypt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from app.infrastructure.database.database import get_db
from app.infrastructure.database.models import User

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Set it in your .env file or container environment before starting the server."
    )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
exp_mins = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
ACCESS_TOKEN_EXPIRE_MINUTES = exp_mins

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash password using bcrypt (cost factor 12)."""
    salt = _bcrypt.gensalt(rounds=12)
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored bcrypt hash."""
    return _bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(VN_TZ) + expires_delta
    else:
        expire = datetime.now(VN_TZ) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # `sub` được encode từ user.id (int) → decode về int hoặc string tùy jose version
        raw_id = payload.get("sub")
        if raw_id is None:
            raise credentials_exception
        user_id = int(raw_id)  # đảm bảo luôn là int dù jose trả về string
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    # Query trực tiếp SQLAlchemy User model (không qua UserRepositoryImpl)
    # để các routers nhận đúng ORM object với đầy đủ relationship
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

