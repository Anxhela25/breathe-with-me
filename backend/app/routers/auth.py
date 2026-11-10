from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.user import (
    ForgotPasswordIn, LoginIn, RegisterIn, RegisterStartIn, ResetPasswordIn, SettingsIn, TokenOut, UserOut,
)
from app.services.auth import create_token, get_current_user, hash_password, verify_password
from app.services import email_verification, password_reset
from app.services.email import send_email
from app.services.email_check import email_problem
from app.services.passwords import password_problem

router = APIRouter(prefix="/api", tags=["account"])


def _check_new_account(db: Session, email: str, password: str) -> None:
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "This email already has an account.")
    if problem := password_problem(password, email):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)


@router.post("/auth/register/start", status_code=status.HTTP_202_ACCEPTED)
def register_start(data: RegisterStartIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Step 1 of sign-up: checks the email and password, then emails a 6-digit code."""
    email = data.email.lower()
    if problem := email_problem(email):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    _check_new_account(db, email, data.password)
    code = email_verification.create_code(db, email)
    if code is None:
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
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code is not valid or has expired. Ask for a new one.")
    now = datetime.now(timezone.utc)
    user = User(
        email=email, password_hash=hash_password(data.password),
        adult_confirmed_at=now, health_data_consent_at=now,
    )
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_token(user))


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is not correct.")
    return TokenOut(access_token=create_token(user))


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
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    user = password_reset.check_code(db, data.email, data.code)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This code is not valid or has expired. Ask for a new one.")
    password_reset.finish(db, user, hash_password(data.password))
    return TokenOut(access_token=create_token(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_settings(data: SettingsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value.upper() if key == "country_code" and value else value)
    db.commit()
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
