from fastapi import HTTPException, status
from app.adapters.repositories.user_repository import UserRepository
from app.domain.entities.user import UserCreate, UserLogin, UserEntity
from app.infrastructure.security.auth import (
    hash_password, verify_password, create_access_token
)
from app.domain.entities.user import Token, UserResponse


class UserUseCases:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register(self, user_data: UserCreate) -> Token:
        existing = self.user_repo.get_by_email(user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã được sử dụng",
            )

        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu phải có ít nhất 6 ký tự",
            )

        new_user = UserEntity(
            name=user_data.name,
            email=user_data.email,
            hashed_password=hash_password(user_data.password)
        )
        created_user = self.user_repo.create(new_user)

        access_token = create_access_token(data={"sub": str(created_user.id)})
        return Token(
            access_token=access_token,
            user=UserResponse.model_validate(created_user),
        )

    def login(self, user_data: UserLogin) -> Token:
        user = self.user_repo.get_by_email(user_data.email)
        if not user or not verify_password(
            user_data.password, user.hashed_password
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email hoặc mật khẩu không đúng",
            )

        access_token = create_access_token(data={"sub": str(user.id)})
        return Token(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    def get_me(self, current_user: UserEntity) -> UserResponse:
        return UserResponse.model_validate(current_user)
