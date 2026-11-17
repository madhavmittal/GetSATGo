import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.feature_flags import (
    GOOGLE_AUTH_SETTING_KEY,
    google_auth_available,
    google_auth_enabled,
)
from app.models.database import get_db
from app.models.models import SystemSetting, User
from app.schemas.schemas import SettingItem, SettingUpdatePayload
from app.api.deps import require_teacher

router = APIRouter(prefix="/settings", tags=["System & Admin Settings"])

DEFAULT_SETTINGS = [
    # Exam Experience
    {
        "key": "default_test_time_minutes",
        "value": 45,
        "category": "Exam & Timer",
        "label": "Default Mock Test Duration (Minutes)",
        "description": "Base time duration allocated for standard mock test sessions.",
        "setting_type": "number",
    },
    {
        "key": "allow_timer_toggle",
        "value": True,
        "category": "Exam & Timer",
        "label": "Allow Student to Hide/Show Timer",
        "description": "Simulates College Board Digital SAT feature allowing students to hide the ticking clock.",
        "setting_type": "boolean",
    },
    {
        "key": "time_trap_threshold_seconds",
        "value": 90,
        "category": "Exam & Timer",
        "label": "Time Trap Alert Threshold (Seconds)",
        "description": "Questions where the student spent longer than this are flagged as pacing bottlenecks.",
        "setting_type": "number",
    },
    {
        "key": "allow_question_flagging",
        "value": True,
        "category": "Exam & Timer",
        "label": "Enable Question Flagging for Review",
        "description": "Allows students to bookmark questions during an active mock test.",
        "setting_type": "boolean",
    },
    {
        "key": "enable_option_strikethrough",
        "value": True,
        "category": "Exam & Timer",
        "label": "Enable Option Elimination (Strikethrough)",
        "description": "Enables crossing out eliminated MCQ options in the test runner.",
        "setting_type": "boolean",
    },
    {
        "key": "target_score",
        "value": 1500,
        "category": "Exam & Timer",
        "label": "Target Benchmark Score",
        "description": "Goal score displayed across student dashboards (SAT scale).",
        "setting_type": "number",
    },

    # Tools & Aids
    {
        "key": "enable_desmos_calculator",
        "value": True,
        "category": "Tools & Calculators",
        "label": "Enable Embedded Desmos Graphing Calculator",
        "description": "Allows students to launch the official SAT Desmos calculator modal during exams & drills.",
        "setting_type": "boolean",
    },
    {
        "key": "enable_math_reference_sheet",
        "value": True,
        "category": "Tools & Calculators",
        "label": "Enable SAT Math Reference Sheet",
        "description": "Provides quick access to standard SAT geometric & algebraic reference formulas.",
        "setting_type": "boolean",
    },

    # Drill Settings
    {
        "key": "default_drill_question_count",
        "value": 5,
        "category": "Drill Practice",
        "label": "Default Questions per Drill Session",
        "description": "Number of practice questions fetched when launching a topic drill.",
        "setting_type": "number",
    },
    {
        "key": GOOGLE_AUTH_SETTING_KEY,
        "value": False,
        "category": "Authentication",
        "label": "Enable Google Sign-In and Registration",
        "description": (
            "Allows Google sign-in and new account requests. Existing password "
            "sign-ins remain available. The deployment must also allow Google auth."
        ),
        "setting_type": "boolean",
    },
]

def init_default_settings(db: Session):
    db.query(SystemSetting).filter(
        SystemSetting.key.in_(
            (
                "require_subscription_for_mocks",
                "require_subscription_for_drills",
                "pro_pass_monthly_price",
                "trial_duration_days",
            )
        )
    ).delete(synchronize_session=False)
    for s_def in DEFAULT_SETTINGS:
        existing = db.query(SystemSetting).filter(SystemSetting.key == s_def["key"]).first()
        if not existing:
            setting = SystemSetting(
                key=s_def["key"],
                value_json=json.dumps(s_def["value"]),
                category=s_def["category"],
                label=s_def["label"],
                description=s_def["description"],
                setting_type=s_def["setting_type"]
            )
            db.add(setting)
    db.commit()

@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """
    Publicly accessible endpoint that supplies frontend feature flags and thresholds.
    """
    settings = db.query(SystemSetting).all()
    if not settings:
        init_default_settings(db)
        settings = db.query(SystemSetting).all()

    values = {s.key: s.value for s in settings}
    values["google_auth_available"] = google_auth_available()
    values[GOOGLE_AUTH_SETTING_KEY] = google_auth_enabled(db)
    return values

@router.get(
    "",
    response_model=List[SettingItem],
    dependencies=[Depends(require_teacher)],
)
def get_all_settings_admin(db: Session = Depends(get_db)):
    """
    Administrator / Teacher view of all controllable system variables with metadata.
    """
    settings = db.query(SystemSetting).order_by(SystemSetting.category, SystemSetting.id).all()
    if not settings:
        init_default_settings(db)
        settings = db.query(SystemSetting).order_by(SystemSetting.category, SystemSetting.id).all()

    items = []
    for s in settings:
        items.append(SettingItem(
            key=s.key,
            value=s.value,
            category=s.category,
            label=s.label,
            description=s.description,
            setting_type=s.setting_type,
            updated_at=s.updated_at
        ))
    return items

@router.put("")
def update_settings(
    payload: SettingUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """
    Updates controllable variables dynamically.
    """
    now = datetime.now(timezone.utc)
    updated_keys = []
    if GOOGLE_AUTH_SETTING_KEY in payload.settings:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can change Google sign-in settings.",
            )
        if not isinstance(payload.settings[GOOGLE_AUTH_SETTING_KEY], bool):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Google sign-in setting must be a boolean.",
            )
        if payload.settings[GOOGLE_AUTH_SETTING_KEY] and not google_auth_available():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "Google sign-in is unavailable. Enable GOOGLE_AUTH_ENABLED "
                    "and configure GOOGLE_CLIENT_ID in the deployment."
                ),
            )

    for key, val in payload.settings.items():
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting:
            setting.value_json = json.dumps(val)
            setting.updated_at = now
            updated_keys.append(key)

    db.commit()
    return {"message": f"Updated {len(updated_keys)} settings successfully", "keys": updated_keys}

@router.post("/reset")
def reset_to_defaults(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    """
    Resets all system settings back to default presets.
    """
    now = datetime.now(timezone.utc)
    for s_def in DEFAULT_SETTINGS:
        if (
            s_def["key"] == GOOGLE_AUTH_SETTING_KEY
            and current_user.role != "admin"
        ):
            continue
        setting = db.query(SystemSetting).filter(SystemSetting.key == s_def["key"]).first()
        if setting:
            setting.value_json = json.dumps(s_def["value"])
            setting.updated_at = now
        else:
            setting = SystemSetting(
                key=s_def["key"],
                value_json=json.dumps(s_def["value"]),
                category=s_def["category"],
                label=s_def["label"],
                description=s_def["description"],
                setting_type=s_def["setting_type"]
            )
            db.add(setting)

    db.commit()
    message = (
        "All settings restored to factory defaults."
        if current_user.role == "admin"
        else "Teacher settings restored to factory defaults."
    )
    return {"message": message}

