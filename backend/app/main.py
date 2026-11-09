from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, chat, episodes, safety

# Tables are managed by Alembic: run `alembic upgrade head` after pulling new migrations.
app = FastAPI(title="Breathe With Me API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(episodes.router)
app.include_router(safety.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
