from typing import Optional
from sqlalchemy.orm import Session
from app.adapters.repositories.user_repository import UserRepository
from app.domain.entities.user import UserEntity
from app.infrastructure.database.models import User


class UserRepositoryImpl(UserRepository):
    def __init__(self, db: Session):
        self.db = db

    def create(self, user: UserEntity) -> UserEntity:
        db_user = User(
            name=user.name,
            email=user.email,
            hashed_password=user.hashed_password
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return UserEntity(
            id=db_user.id,
            name=db_user.name,
            email=db_user.email,
            hashed_password=db_user.hashed_password,
            created_at=db_user.created_at
        )

    def get_by_email(self, email: str) -> Optional[UserEntity]:
        db_user = self.db.query(User).filter(User.email == email).first()
        if not db_user:
            return None
        return UserEntity(
            id=db_user.id,
            name=db_user.name,
            email=db_user.email,
            hashed_password=db_user.hashed_password,
            created_at=db_user.created_at
        )

    def get_by_id(self, user_id: int) -> Optional[UserEntity]:
        db_user = self.db.query(User).filter(User.id == user_id).first()
        if not db_user:
            return None
        return UserEntity(
            id=db_user.id,
            name=db_user.name,
            email=db_user.email,
            hashed_password=db_user.hashed_password,
            created_at=db_user.created_at
        )
