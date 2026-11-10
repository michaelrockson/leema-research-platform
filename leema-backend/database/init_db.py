import os
import sys

# Ensure backend root is on sys.path when script is executed directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from database import Base, database_engine, get_session
from repositories.settings_repository import SettingsRepository
from utils.logger import logger


def init_db():
    try:
        Base.metadata.create_all(bind = database_engine)
        logger.info(
            "Database initialized successfully (new tables created if missing).")

        session = get_session()
        try:
            settings_repo = SettingsRepository(session)
            settings_repo.seed_default_settings()
        finally:
            session.close()
    except Exception as error:
        logger.error(f"Database initialization failed: {error}")
        raise RuntimeError(f"Database initialization failed: {error}") from error


if __name__ == "__main__":
    init_db()
