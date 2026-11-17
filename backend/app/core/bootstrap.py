import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.models import User

logger = logging.getLogger(__name__)


def ensure_superuser(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    environment: str,
) -> None:
    normalized_email = email.strip().lower()
    existing_user = (
        db.query(User).filter(func.lower(User.email) == normalized_email).first()
        if normalized_email
        else None
    )
    if existing_user:
        if existing_user.role != "admin":
            raise RuntimeError(
                "SUPERUSER_EMAIL is already registered as a non-admin account."
            )
        if not existing_user.is_approved:
            existing_user.is_approved = True
            db.commit()
        return

    if not normalized_email and db.query(User).filter(User.role == "admin").first():
        return

    if not normalized_email and not password:
        if environment.lower() == "production":
            raise RuntimeError(
                "Set SUPERUSER_EMAIL and SUPERUSER_PASSWORD until the first admin is created."
            )
        logger.warning("No superuser bootstrap credentials are configured.")
        return

    if not normalized_email or not password:
        raise RuntimeError("SUPERUSER_EMAIL and SUPERUSER_PASSWORD must be set together.")
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        raise RuntimeError(
            "SUPERUSER_PASSWORD must be at least 12 characters and no more than 72 UTF-8 bytes."
        )

    user = User(
        email=normalized_email,
        hashed_password=get_password_hash(password),
        full_name=full_name.strip() or "GetSATGo Owner",
        role="admin",
        is_approved=True,
    )
    db.add(user)
    db.commit()
