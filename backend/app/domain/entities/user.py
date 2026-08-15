from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserEntity(BaseModel):
    id: Optional[int] = None
    name: str
    email: EmailStr
    hashed_password: str
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
