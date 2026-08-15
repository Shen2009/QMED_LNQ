from fastapi import Depends
from sqlalchemy.orm import Session
from app.infrastructure.database.database import get_db
from app.adapters.repositories.user_repository import UserRepository
from app.infrastructure.database.user_repository_impl import UserRepositoryImpl
from app.use_cases.user_use_cases import UserUseCases

# --- Dependency Injection Provider ---

def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    """Provide the UserRepository implementation."""
    return UserRepositoryImpl(db)

def get_user_use_cases(repo: UserRepository = Depends(get_user_repository)) -> UserUseCases:
    """Provide the UserUseCases with its dependencies injected."""
    return UserUseCases(repo)
