import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CalmCheck, Episode, User
from app.schemas.user import (
    ForgotPasswordIn, LoginIn, RefreshIn, RegisterIn, RegisterStartIn, ResetPasswordIn, SettingsIn, TokenOut, UserOut,
)
from app.services.auth import get_current_user, hash_password, verify_password
from app.services import email_verification, password_reset, tokens
from app.services.email import send_email
from app.services.email_check import email_problem
from app.services.passwords import password_problem

router = APIRouter(prefix="/api", tags=["account"])
# never log emails or passwords; user ids are enough to find the account
log = logging.getLogger("breathe.auth")


def _check_new_account(db: Session, email: str, password: str) -> None:
    if db.scalar(select(User).where(User.email == email)):
        log.info("Sign-up refused: the email already has an account")
        raise HTTPException(status.HTTP_409_CONFLICT, "This email already has an account.")
    if problem := password_problem(password, email):
        log.info("Sign-up refused: %s", problem)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)


@router.post("/auth/register/start", status_code=status.HTTP_202_ACCEPTED)
def register_start(data: RegisterStartIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Step 1 of sign-up: checks the email and password, then emails a 6-digit code."""
    email = data.email.lower()
    if problem := email_problem(email):
        log.info("Sign-up refused: the email domain can't receive mail")
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    _check_new_account(db, email, data.password)
    code = email_verification.create_code(db, email)
    if code is None:
        log.warning("Sign-up code refused: too many codes for one email in the last hour")
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            "You asked for several codes. Please check your email or try again in an hour.")
    background.add_task(send_email, email, "Your Breathe With Me code", email_verification.email_text(code))
    return {"detail": f"We've sent a 6-digit code to {email}."}


@router.post("/auth/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    """Step 2 of sign-up: creates the account once the emailed code is right."""
    email = data.email.lower()
    _check_new_account(db, email, data.password)
    if not email_verification.use_code(db, email, data.code):
        log.info("Sign-up refused: wrong or expired code")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code is not valid or has expired. Ask for a new one.")
    now = datetime.now(timezone.utc)
    user = User(
        email=email, password_hash=hash_password(data.password),
        adult_confirmed_at=now, health_data_consent_at=now,
    )
    db.add(user)
    db.commit()
    log.info("Account %d created", user.id)
    return tokens.issue(db, user)


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user:
        log.info("Login failed: no account with this email")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is not correct.")
    if not verify_password(data.password, user.password_hash):
        log.info("Login failed: wrong password for account %d", user.id)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is not correct.")
    return tokens.issue(db, user)


@router.post("/auth/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(data: ForgotPasswordIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    # same answer whether or not the account exists
    if found := password_reset.create_code(db, data.email):
        email, code = found
        background.add_task(send_email, email, "Your Breathe With Me code", password_reset.email_text(code))
    return {"detail": "If an account exists for this email, we've sent a 6-digit code."}


@router.post("/auth/reset-password", response_model=TokenOut)
def reset_password(data: ResetPasswordIn, db: Session = Depends(get_db)):
    if problem := password_problem(data.password, data.email):
        log.info("Password reset refused: %s", problem)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    user = password_reset.check_code(db, data.email, data.code)
    if user is None:
        log.info("Password reset refused: wrong or expired code")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code is not valid or has expired. Ask for a new one.")
    password_reset.finish(db, user, hash_password(data.password))
    tokens.revoke_all(db, user)  # every other phone logs out
    log.info("Password reset for account %d", user.id)
    return tokens.issue(db, user)


@router.post("/auth/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    """A new pair of keys for a refresh key; the old one stops working. 401: log in again."""
    pair = tokens.rotate(db, data.refresh_token)
    if pair is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
    return pair


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshIn, db: Session = Depends(get_db)):
    """This phone's refresh key stops working. Answers the same whether or not the key was valid."""
    tokens.revoke(db, data.refresh_token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_settings(data: SettingsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value.upper() if key == "country_code" and value else value)
    db.commit()
    return user


@router.delete("/me/history", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # sessions and calm checks (the usual rhythm is worked out from them); account and contacts stay
    calm_checks = db.execute(delete(CalmCheck).where(CalmCheck.user_id == user.id)).rowcount
    episodes = db.execute(delete(Episode).where(Episode.user_id == user.id)).rowcount
    db.commit()
    log.info("Account %d deleted its history: %d sessions, %d calm checks", user.id, episodes, calm_checks)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = user.id
    db.delete(user)
    db.commit()
    log.info("Account %d deleted with all its data", user_id)
