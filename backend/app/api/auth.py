import hmac

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    PendingRegistrationResponse,
    RegistrationRequestCreated,
    Token,
    UserLogin,
    UserRegister,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=RegistrationRequestCreated,
    status_code=status.HTTP_202_ACCEPTED,
)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    email = str(user_in.email).strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    if user_in.role == "teacher" and (
        not settings.TEACHER_SIGNUP_CODE
        or not user_in.teacher_invite_code
        or not hmac.compare_digest(
            user_in.teacher_invite_code, settings.TEACHER_SIGNUP_CODE
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A valid teacher invitation code is required.",
        )

    user = User(
        email=email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        is_approved=False,
    )
    db.add(user)
    db.commit()
    return RegistrationRequestCreated(
        message="Your account request was sent to the administrator. You can sign in after approval."
    )


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    email = str(login_data.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval.",
        )

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get(
    "/admin/pending-registrations",
    response_model=list[PendingRegistrationResponse],
    dependencies=[Depends(require_admin)],
)
def list_pending_registrations(db: Session = Depends(get_db)):
    return (
        db.query(User)
        .filter(
            User.is_approved.is_(False),
            User.role.in_(("student", "teacher")),
        )
        .order_by(User.created_at.asc())
        .all()
    )


@router.post(
    "/admin/pending-registrations/{user_id}/approve",
    response_model=UserResponse,
    dependencies=[Depends(require_admin)],
)
def approve_registration(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.is_approved.is_(False),
            User.role.in_(("student", "teacher")),
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending registration not found.",
        )

    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user


@router.delete(
    "/admin/pending-registrations/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def reject_registration(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.is_approved.is_(False),
            User.role.in_(("student", "teacher")),
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending registration not found.",
        )

    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
