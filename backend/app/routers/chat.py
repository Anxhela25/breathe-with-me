from dataclasses import asdict

from fastapi import APIRouter

from app.schemas.chat import ChatIn, ChatOut
from app.services.chat import run_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatOut)
def chat(data: ChatIn):
    # TODO: save messages. Nothing is stored yet, whatever save_chat_texts says
    history = [line.model_dump() for line in data.history]
    return asdict(run_chat(data.message, history, data.level, data.safe_confirmed))
