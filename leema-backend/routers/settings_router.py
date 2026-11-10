from typing import List, Optional, Dict, Any, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_session
from repositories.settings_repository import SettingsRepository
from utils.logger import logger

router = APIRouter(tags = ["Settings"])


class SettingsCreateRequest(BaseModel):
    communities: Optional[List[str]] = None
    signals: Optional[List[str]] = None
    conversations_per_community: Optional[int] = None
    conversationsPerCommunity: Optional[int] = None
    replies_per_conversation: Optional[int] = None
    repliesPerConversation: Optional[int] = None


class SettingsUpdateRequest(BaseModel):
    communities: Optional[List[str]] = None
    signals: Optional[List[str]] = None
    conversations_per_community: Optional[int] = None
    conversationsPerCommunity: Optional[int] = None
    replies_per_conversation: Optional[int] = None
    repliesPerConversation: Optional[int] = None


def _normalize_settings_payload(
    payload: Union[SettingsCreateRequest, SettingsUpdateRequest]
) -> Dict[str, Any]:
    conv_limit = (
        payload.conversations_per_community
        if payload.conversations_per_community is not None
        else payload.conversationsPerCommunity
    )
    rep_limit = (
        payload.replies_per_conversation
        if payload.replies_per_conversation is not None
        else payload.repliesPerConversation
    )
    return {
        "communities": payload.communities,
        "signals": payload.signals,
        "conversations_per_community": conv_limit,
        "replies_per_conversation": rep_limit,
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
    except Exception as err:
        logger.error(f"Failed to fetch settings: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to fetch settings: {err}"
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
    except Exception as err:
        logger.error(f"Failed to fetch setting {setting_id}: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to fetch setting: {err}"
        )
    finally:
        session.close()


@router.post("/settings")
def create_settings(payload: SettingsCreateRequest):
    """
    CRUD - Create:
    Create a new settings configuration record.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        normalized = _normalize_settings_payload(payload)
        setting = repo.create_setting(**normalized)
        return {
            "success": True,
            "message": "Settings created successfully",
            "data": setting.to_dict(),
        }
    except Exception as err:
        logger.error(f"Failed to create settings: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to create settings: {err}"
        )
    finally:
        session.close()


@router.put("/settings")
@router.put("/settings/{setting_id}")
def update_settings(
    payload: SettingsUpdateRequest, setting_id: Optional[int] = None
):
    """
    CRUD - Update:
    Update existing settings configuration. If setting_id is omitted, updates active settings.
    """
    session = get_session()
    try:
        repo = SettingsRepository(session)
        normalized = _normalize_settings_payload(payload)
        setting = repo.update_settings(setting_id = setting_id, **normalized)
        return {
            "success": True,
            "message": "Settings updated successfully",
            "data": setting.to_dict(),
        }
    except Exception as err:
        logger.error(f"Failed to update settings: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to update settings: {err}"
        )
    finally:
        session.close()


@router.patch("/settings")
@router.patch("/settings/{setting_id}")
def patch_settings(
    payload: SettingsUpdateRequest, setting_id: Optional[int] = None
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
    except Exception as err:
        logger.error(f"Failed to delete setting {setting_id}: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to delete setting: {err}"
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
    except Exception as err:
        logger.error(f"Failed to reset settings: {err}")
        raise HTTPException(
            status_code = 500, detail = f"Failed to reset settings: {err}"
        )
    finally:
        session.close()
