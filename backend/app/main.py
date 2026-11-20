import logging
import time

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auth, calm_checks, chat, contacts, episodes, insights, safety

# show time and module in the logs
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("breathe.api")

# tables come from alembic: run `alembic upgrade head`
app = FastAPI(title="Breathe With Me API", version="0.1.0")


# added before CORS so error responses still get CORS headers (otherwise the phone says offline)
@app.middleware("http")
async def log_failed_requests(request: Request, call_next):
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("%s %s crashed after %.2fs", request.method, request.url.path, time.monotonic() - start)
        return JSONResponse({"detail": "Something went wrong. Please try again."}, status_code=500)
    took = time.monotonic() - start
    if response.status_code >= 500:
        log.error("%s %s -> %d (%.2fs)", request.method, request.url.path, response.status_code, took)
    elif response.status_code >= 400:
        log.info("%s %s -> %d (%.2fs)", request.method, request.url.path, response.status_code, took)
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def log_invalid_request(request: Request, error: RequestValidationError):
    # log field + reason only, the value could be a password
    problems = [f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in jsonable_encoder(error.errors())]
    log.info("%s %s rejected: %s", request.method, request.url.path, "; ".join(problems))
    return await request_validation_exception_handler(request, error)


app.include_router(auth.router)
app.include_router(episodes.router)
app.include_router(safety.router)
app.include_router(chat.router)
app.include_router(contacts.router)
app.include_router(insights.router)
app.include_router(calm_checks.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
