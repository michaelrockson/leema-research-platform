from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import get_session
from repositories.settings_repository import SettingsRepository
from settings.setting_defaults import SETTING_DEFAULTS
from utils.logger import logger

router = APIRouter(tags = ["Settings"])

EMAIL_PATTERN = r"^$|^[^@\s]+@[^@\s]+\.[^@\s]+$"


class SettingsRequest(BaseModel):
    communities: Optional[List[str]] = Field(default = None, min_length = 1)
    signals: Optional[List[str]] = Field(default = None, min_length = 1)
    conversations_per_community: Optional[int] = Field(
        default = None, ge = 1, le = 250)
    replies_per_conversation: Optional[int] = Field(
        default = None, ge = 0, le = 500)
    max_scout_results: Optional[int] = Field(default = None, ge = 1, le = 500)
    min_comments: Optional[int] = Field(default = None, ge = 0)
    min_score: Optional[int] = Field(default = None, ge = 0)
    min_upvote_ratio: Optional[float] = Field(default = None, ge = 0, le = 1)
    recipient_address: Optional[str] = Field(
        default = None, max_length = 320, pattern = EMAIL_PATTERN)
    notion_database_id: Optional[str] = Field(default = None, max_length = 64)
    agent_model: Optional[str] = Field(
        default = None, min_length = 1, max_length = 100)
    scout_model: Optional[str] = Field(
        default = None, min_length = 1, max_length = 100)
    reddit_max_requests_per_min: Optional[int] = Field(
        default = None, ge = 1, le = 60)
    reddit_max_concurrency: Optional[int] = Field(
        default = None, ge = 1, le = 20)
    reddit_batch_size: Optional[int] = Field(default = None, ge = 1, le = 50)
    reddit_batch_delay: Optional[float] = Field(
        default = None, ge = 0, le = 30)
    reddit_max_retries: Optional[int] = Field(default = None, ge = 1, le = 10)
    gemini_max_requests_per_min: Optional[int] = Field(
        default = None, ge = 1, le = 1000)
    gemini_max_concurrency: Optional[int] = Field(
        default = None, ge = 1, le = 10)
    gemini_max_retries: Optional[int] = Field(default = None, ge = 1, le = 10)


@router.get("/settings/defaults")
def get_default_settings():
    """
    The factory default for every editable setting, taken from settings.py.
    Used by the settings panel to restore defaults before the user saves.
    """
    return {
        "success": True,
        "message": "Default settings retrieved successfully",
        "data": dict(SETTING_DEFAULTS),
    }


@router.get("/settings")
def get_active_settings():
    """
    CRUD - Read:
    Retrieve the current active settings configuration (communities, signals, conversation/reply counts).
    Seeds the default settings automatically if the table is empty.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        setting = repo.get_settings()
        return {
            "success": True,
            "message": "Settings retrieved successfully",
            "data": setting.to_dict(),
        }
    except Exception as error:
        logger.error(f"Failed to fetch settings: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to fetch settings: {error}"
        )
    finally:
        session.close()


@router.get("/settings/{setting_id}")
def get_setting_by_id(setting_id: int):
    """
    CRUD - Read by ID:
    Retrieve a specific settings configuration record by its ID.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        setting = repo.get_setting_by_id(setting_id)
        if not setting:
            raise HTTPException(
                status_code = 404,
                detail = f"Setting with ID {setting_id} not found",
            )
        return {
            "success": True,
            "message": f"Setting {setting_id} retrieved successfully",
            "data": setting.to_dict(),
        }
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Failed to fetch setting {setting_id}: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to fetch setting: {error}"
        )
    finally:
        session.close()


@router.post("/settings")
def create_settings(payload: SettingsRequest):
    """
    CRUD - Create:
    Create a new settings configuration record.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        normalized = payload.model_dump(exclude_none = True)
        setting = repo.create_setting(**normalized)
        return {
            "success": True,
            "message": "Settings created successfully",
            "data": setting.to_dict(),
        }
    except Exception as error:
        logger.error(f"Failed to create settings: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to create settings: {error}"
        )
    finally:
        session.close()


@router.put("/settings")
@router.put("/settings/{setting_id}")
def update_settings(
    payload: SettingsRequest, setting_id: Optional[int] = None
):
    """
    CRUD - Update:
    Update existing settings configuration. If setting_id is omitted, updates active settings.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        normalized = payload.model_dump(exclude_none = True)
        setting = repo.update_settings(setting_id = setting_id, **normalized)
        return {
            "success": True,
            "message": "Settings updated successfully",
            "data": setting.to_dict(),
        }
    except Exception as error:
        logger.error(f"Failed to update settings: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to update settings: {error}"
        )
    finally:
        session.close()


@router.patch("/settings")
@router.patch("/settings/{setting_id}")
def patch_settings(
    payload: SettingsRequest, setting_id: Optional[int] = None
):
    """
    CRUD - Partial Update:
    Partially update existing settings configuration.
    """
    return update_settings(payload = payload, setting_id = setting_id)


@router.delete("/settings/{setting_id}")
def delete_setting(setting_id: int):
    """
    CRUD - Delete:
    Delete a specific settings configuration record by ID.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        deleted = repo.delete_setting(setting_id)
        if not deleted:
            raise HTTPException(
                status_code = 404,
                detail = f"Setting with ID {setting_id} not found",
            )
        return {
            "success": True,
            "message": f"Setting with ID {setting_id} deleted successfully",
        }
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Failed to delete setting {setting_id}: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to delete setting: {error}"
        )
    finally:
        session.close()


@router.post("/settings/reset")
def reset_settings():
    """
    Reset settings configuration back to factory default values.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        setting = repo.seed_default_settings(force = True)
        return {
            "success": True,
            "message": "Settings reset to defaults successfully",
            "data": setting.to_dict(),
        }
    except Exception as error:
        logger.error(f"Failed to reset settings: {error}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to reset settings: {error}"
        )
    finally:
        session.close()
