from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.infrastructure.database.models import User
from app.domain.entities.user import UserCreate, UserLogin, UserResponse, Token
from app.infrastructure.security.auth import get_current_user
from app.use_cases.user_use_cases import UserUseCases
from app.infrastructure.web.dependencies import get_user_use_cases
from app.infrastructure.logging.audit import (
    log_register, log_login_success, log_login_failed,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register", response_model=Token, status_code=status.HTTP_201_CREATED
)
def register(
    user_data: UserCreate,
    request: Request,
    use_cases: UserUseCases = Depends(get_user_use_cases),
):
    """Đăng ký tài khoản mới"""
    result = use_cases.register(user_data)
    client_ip = request.client.host if request.client else "-"
    log_register(result.user.id, user_data.email, client_ip)
    return result


@router.post("/login", response_model=Token)
def login(
    user_data: UserLogin,
    request: Request,
    use_cases: UserUseCases = Depends(get_user_use_cases),
):
    """Đăng nhập"""
    client_ip = request.client.host if request.client else "-"
    try:
        result = use_cases.login(user_data)
        log_login_success(result.user.id, user_data.email, client_ip)
        return result
    except HTTPException as exc:
        log_login_failed(user_data.email, client_ip, reason=exc.detail)
        raise


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    use_cases: UserUseCases = Depends(get_user_use_cases)
):
    """Lấy thông tin user hiện tại"""
    return use_cases.get_me(current_user)