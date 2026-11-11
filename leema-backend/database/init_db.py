import os
import sys

# Ensure backend root is on sys.path when script is executed directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from sqlalchemy import inspect, text

from database import Base, database_engine, get_session
from repositories.settings_repository import SettingsRepository
from utils.logger import logger


def add_missing_columns():
    """
    create_all() never alters existing tables, so columns added to a model
    after its table was created are added here. New columns must be nullable.
    """
    inspector = inspect(database_engine)
    existing_tables = set(inspector.get_table_names())

    with database_engine.begin() as connection:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            existing_columns = {
                column["name"] for column in inspector.get_columns(table.name)
            }
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                column_type = column.type.compile(dialect = database_engine.dialect)
                connection.execute(text(
                    f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {column_type}'
                ))
                logger.info(f"Added missing column {table.name}.{column.name}")


def init_db():
    try:
        Base.metadata.create_all(bind = database_engine)
        add_missing_columns()
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
