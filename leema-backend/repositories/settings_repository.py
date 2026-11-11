from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import get_session
from database.models import Setting
from settings.setting_defaults import EDITABLE_SETTING_FIELDS, \
    SETTING_DEFAULTS
from utils.logger import logger


def _clean_communities(communities: List[str]) -> List[str]:
    cleaned = []
    for community in communities:
        name = community.strip().removeprefix("r/").strip()
        if name and name not in cleaned:
            cleaned.append(name)
    return cleaned


def _clean_signals(signals: List[str]) -> List[str]:
    cleaned = []
    for signal in signals:
        phrase = signal.strip()
        if phrase and phrase not in cleaned:
            cleaned.append(phrase)
    return cleaned


def _clean_changes(changes: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = {
        field_name: value
        for field_name, value in changes.items()
        if field_name in EDITABLE_SETTING_FIELDS and value is not None
    }
    if "communities" in cleaned:
        cleaned["communities"] = _clean_communities(cleaned["communities"])
    if "signals" in cleaned:
        cleaned["signals"] = _clean_signals(cleaned["signals"])
    for text_field in ("recipient_address", "notion_database_id",
                       "agent_model", "scout_model"):
        if text_field in cleaned:
            cleaned[text_field] = cleaned[text_field].strip()
    return cleaned


class SettingsRepository:
    """
    Repository for handling Setting database operations and seeding default settings.
    """


    def __init__(self, session: Optional[Session] = None):
        self.session = session if session is not None else get_session()


    def get_settings(self) -> Setting:
        """
        Retrieve the primary/active settings record.
        Auto-seeds default settings if table is empty.
        """
        setting = self.session.query(Setting).order_by(
            Setting.id.asc()).first()
        if not setting:
            setting = self.seed_default_settings()
        return setting


    def get_setting_by_id(self, setting_id: int) -> Optional[Setting]:
        """
        Retrieve a setting record by its ID.
        """
        return self.session.query(Setting).filter(
            Setting.id == setting_id).first()


    def get_all_settings(self) -> List[Setting]:
        """
        Retrieve all setting records.
        """
        records = self.session.query(Setting).order_by(Setting.id.asc()).all()
        if not records:
            default_setting = self.seed_default_settings()
            return [default_setting]
        return records


    def create_setting(self, **changes: Any) -> Setting:
        """
        Create a new setting record. Fields that are not supplied fall back
        to the defaults in settings.py.
        """
        setting = Setting(**{**SETTING_DEFAULTS, **_clean_changes(changes)})
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        logger.info(f"Created new settings record with id={setting.id}")
        return setting


    def update_settings(self, setting_id: Optional[int] = None,
                        **changes: Any) -> Setting:
        """
        Update an existing setting record, or the primary setting if ID is omitted.
        """
        if setting_id is not None:
            setting = self.get_setting_by_id(setting_id)
        else:
            setting = self.session.query(Setting).order_by(
                Setting.id.asc()).first()

        if not setting:
            return self.create_setting(**changes)

        for field_name, value in _clean_changes(changes).items():
            setattr(setting, field_name, value)

        setting.updated_at = datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(setting)
        logger.info(f"Updated settings record id={setting.id}")
        return setting


    def delete_setting(self, setting_id: int) -> bool:
        """
        Delete a setting record by ID.
        """
        setting = self.get_setting_by_id(setting_id)
        if not setting:
            return False

        self.session.delete(setting)
        self.session.commit()
        logger.info(f"Deleted settings record id={setting_id}")
        return True


    def seed_default_settings(self, force: bool = False) -> Setting:
        """
        Seed default settings into the database upon initialization if none exist or if force=True.
        """
        existing = self.session.query(Setting).order_by(
            Setting.id.asc()).first()
        if existing and not force:
            logger.info("Settings already exist in database; skipping seed.")
            return existing

        if existing and force:
            for field_name, default_value in SETTING_DEFAULTS.items():
                setattr(existing, field_name, default_value)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.commit()
            self.session.refresh(existing)
            logger.info("Force-reseeded default settings in database.")
            return existing

        new_setting = Setting(**SETTING_DEFAULTS)
        self.session.add(new_setting)
        self.session.commit()
        self.session.refresh(new_setting)
        logger.info("Successfully seeded default settings into the database.")
        return new_setting
