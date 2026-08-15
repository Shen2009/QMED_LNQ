from abc import ABC, abstractmethod
from typing import Optional
from app.domain.entities.user import UserEntity


class UserRepository(ABC):
    @abstractmethod
    def create(self, user: UserEntity) -> UserEntity:
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[UserEntity]:
        pass

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[UserEntity]:
        pass
