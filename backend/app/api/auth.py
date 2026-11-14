from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, SubscriptionUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Subscription"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    
    # By default, give students a 30-day active pass or trial pass so they can test immediately
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role or "student",
        subscription_status="active",
        subscription_plan="Pro SAT Mastery Pass",
        subscription_expires_at=expires
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/subscribe", response_model=UserResponse)
def activate_subscription(
    sub_in: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Activates or renews the student's SAT platform subscription
    """
    days = sub_in.duration_months * 30
    current_user.subscription_status = "active"
    current_user.subscription_plan = sub_in.plan
    current_user.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/simulate-expire", response_model=UserResponse)
def simulate_expire_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Helper endpoint for testing subscription gating (sets status to expired)
    """
    current_user.subscription_status = "expired"
    current_user.subscription_expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()
    db.refresh(current_user)
    return current_user

