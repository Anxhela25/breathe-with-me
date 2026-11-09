from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  (registers all tables)
from app.config import settings
from app.database import Base, engine
from app.routers import auth, chat, episodes, safety


@asynccontextmanager
async def lifespan(_: FastAPI):
    # TODO: replace with Alembic migrations
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Breathe With Me API", version="0.1.0", lifespan=lifespan)
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
