from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str          # "user" | "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    language: str = "vi"


class ChatResponse(BaseModel):
    reply: str
    model: str = "google/medgemma-4b-it"
