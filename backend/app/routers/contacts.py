from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EmergencyContact, User
from app.schemas.contact import ContactIn, ContactOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

MAX_CONTACTS = 5


def _own_contact(contact_id: int, user: User, db: Session) -> EmergencyContact:
    contact = db.get(EmergencyContact, contact_id)
    if contact is None or contact.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found.")
    return contact


@router.get("", response_model=list[ContactOut])
def list_contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(EmergencyContact).where(EmergencyContact.user_id == user.id).order_by(EmergencyContact.id)).all()


@router.post("", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
def add_contact(data: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(EmergencyContact).where(EmergencyContact.user_id == user.id))
    if count >= MAX_CONTACTS:
        raise HTTPException(status.HTTP_409_CONFLICT, f"You can save up to {MAX_CONTACTS} contacts.")
    contact = EmergencyContact(user_id=user.id, name=data.name, phone=data.phone)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, data: ContactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = _own_contact(contact_id, user, db)
    contact.name, contact.phone = data.name, data.phone
    db.commit()
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(contact_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_own_contact(contact_id, user, db))
    db.commit()
