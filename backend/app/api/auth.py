import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, Response, status
from google.auth.exceptions import TransportError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.id_token import verify_oauth2_token
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    GoogleAuthRequest,
    PendingRegistrationResponse,
    RegistrationRequestCreated,
    Token,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
def register():
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Password registration is disabled. Create an account with Google.",
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


@router.post(
    "/google",
    response_model=Token | RegistrationRequestCreated,
    responses={202: {"model": RegistrationRequestCreated}},
)
def google_auth(
    auth_data: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured.",
        )

    try:
        claims = verify_oauth2_token(
            auth_data.credential,
            GoogleRequest(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential.",
        ) from exc
    except TransportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is temporarily unavailable.",
        ) from exc

    email = claims.get("email")
    if (
        not isinstance(email, str)
        or not email.strip()
        or claims.get("email_verified") is not True
        or not isinstance(claims.get("sub"), str)
        or not claims["sub"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google must provide a verified email address.",
        )

    email = email.strip().lower()
    full_name = claims.get("name")
    if not isinstance(full_name, str) or not full_name.strip():
        full_name = email.partition("@")[0]
    else:
        full_name = full_name.strip()

    user = db.query(User).filter(func.lower(User.email) == email).first()
    created_user = False
    if user is None:
        if auth_data.mode != "register":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account exists for this Google email. Create an account first.",
            )

        if auth_data.role == "teacher" and (
            not settings.TEACHER_SIGNUP_CODE
            or not auth_data.teacher_invite_code
            or not hmac.compare_digest(
                auth_data.teacher_invite_code, settings.TEACHER_SIGNUP_CODE
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A valid teacher invitation code is required.",
            )

        user = User(
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            full_name=full_name,
            role=auth_data.role,
            is_approved=False,
        )
        db.add(user)
        try:
            db.commit()
            created_user = True
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(func.lower(User.email) == email).first()
            if user is None:
                raise

    if not user.is_approved:
        if created_user:
            response.status_code = status.HTTP_202_ACCEPTED
            return RegistrationRequestCreated(
                message="Your account request was sent to the administrator. You can sign in after approval."
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval.",
        )

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


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
