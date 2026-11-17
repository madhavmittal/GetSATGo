from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import SystemSetting

GOOGLE_AUTH_SETTING_KEY = "google_auth_enabled"


def google_auth_available() -> bool:
    return settings.GOOGLE_AUTH_ENABLED and bool(settings.GOOGLE_CLIENT_ID)


def google_auth_enabled(db: Session) -> bool:
    if not google_auth_available():
        return False

    setting = (
        db.query(SystemSetting)
        .filter(SystemSetting.key == GOOGLE_AUTH_SETTING_KEY)
        .first()
    )
    return setting is not None and setting.value is True
