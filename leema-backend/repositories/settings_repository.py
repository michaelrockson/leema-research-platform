from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from database import get_session
from database.models import Setting
from utils.logger import logger

# Default values mirroring frontend and backend defaults
DEFAULT_COMMUNITIES: List[str] = [
    "accounting",
    "bookkeeping",
    "smallbusiness",
    "ecommerce",
    "sales",
]

DEFAULT_SIGNALS: List[str] = [
    "tired of",
    "frustrated",
    "annoying",
    "hate",
    "nightmare",
    "painful",
    "struggling with",
    "fed up",
    "manual process",
]

DEFAULT_CONVERSATIONS_PER_COMMUNITY: int = 50
DEFAULT_REPLIES_PER_CONVERSATION: int = 10


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


    def create_setting(
        self,
        communities: Optional[List[str]] = None,
        signals: Optional[List[str]] = None,
        conversations_per_community: Optional[int] = None,
        replies_per_conversation: Optional[int] = None,
    ) -> Setting:
        """
        Create a new setting record.
        """
        cleaned_communities = (
            [c.strip().replace("r/", "") for c in communities if c.strip()]
            if communities is not None
            else DEFAULT_COMMUNITIES
        )
        cleaned_signals = (
            [s.strip() for s in signals if s.strip()]
            if signals is not None
            else DEFAULT_SIGNALS
        )

        setting = Setting(
            communities = cleaned_communities,
            signals = cleaned_signals,
            conversations_per_community = (
                conversations_per_community
                if conversations_per_community is not None
                else DEFAULT_CONVERSATIONS_PER_COMMUNITY
            ),
            replies_per_conversation = (
                replies_per_conversation
                if replies_per_conversation is not None
                else DEFAULT_REPLIES_PER_CONVERSATION
            ),
        )
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        logger.info(f"Created new settings record with id={setting.id}")
        return setting


    def update_settings(
        self,
        setting_id: Optional[int] = None,
        communities: Optional[List[str]] = None,
        signals: Optional[List[str]] = None,
        conversations_per_community: Optional[int] = None,
        replies_per_conversation: Optional[int] = None,
    ) -> Setting:
        """
        Update an existing setting record, or the primary setting if ID is omitted.
        """
        if setting_id is not None:
            setting = self.get_setting_by_id(setting_id)
        else:
            setting = self.session.query(Setting).order_by(
                Setting.id.asc()).first()

        if not setting:
            return self.create_setting(
                communities = communities,
                signals = signals,
                conversations_per_community = conversations_per_community,
                replies_per_conversation = replies_per_conversation,
            )

        if communities is not None:
            setting.communities = [
                c.strip().replace("r/", "") for c in communities if c.strip()
            ]

        if signals is not None:
            setting.signals = [s.strip() for s in signals if s.strip()]

        if conversations_per_community is not None:
            setting.conversations_per_community = conversations_per_community

        if replies_per_conversation is not None:
            setting.replies_per_conversation = replies_per_conversation

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
            existing.communities = DEFAULT_COMMUNITIES
            existing.signals = DEFAULT_SIGNALS
            existing.conversations_per_community = DEFAULT_CONVERSATIONS_PER_COMMUNITY
            existing.replies_per_conversation = DEFAULT_REPLIES_PER_CONVERSATION
            existing.updated_at = datetime.now(timezone.utc)
            self.session.commit()
            self.session.refresh(existing)
            logger.info("Force-reseeded default settings in database.")
            return existing

        new_setting = Setting(
            communities = DEFAULT_COMMUNITIES,
            signals = DEFAULT_SIGNALS,
            conversations_per_community = DEFAULT_CONVERSATIONS_PER_COMMUNITY,
            replies_per_conversation = DEFAULT_REPLIES_PER_CONVERSATION,
        )
        self.session.add(new_setting)
        self.session.commit()
        self.session.refresh(new_setting)
        logger.info("Successfully seeded default settings into the database.")
        return new_setting
