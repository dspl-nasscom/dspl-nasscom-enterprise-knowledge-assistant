"""Google Cloud Data Loss Prevention (DLP) API helper for PII masking."""

import asyncio
import functools
from google.cloud import dlp_v2
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def _run_in_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))


def _dlp_deidentify_text(project_id: str, text: str) -> str:
    client = dlp_v2.DlpServiceClient()
    parent = f"projects/{project_id}"
    
    info_types = [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
    ]
    
    inspect_config = {
        "info_types": info_types,
    }
    
    deidentify_config = {
        "info_type_transformations": {
            "transformations": [
                {
                    "info_types": [],  # Empty list applies transformation to all inspection info_types
                    "primitive_transformation": {
                        "replace_with_info_type_config": {}
                    }
                }
            ]
        }
    }
    
    item = {"value": text}
    response = client.deidentify_content(
        request={
            "parent": parent,
            "inspect_config": inspect_config,
            "deidentify_config": deidentify_config,
            "item": item,
        }
    )
    return response.item.value


async def mask_pii_text(text: str) -> str:
    """Mask PII in a given text using Google Cloud DLP API.
    
    Returns the masked text. If DLP fails, returns the original text.
    """
    if not text:
        return text
    try:
        project_id = settings.firestore_project
        if not project_id:
            import google.auth
            _, project_id = google.auth.default()
            
        if not project_id:
            logger.warning("dlp_masking_skipped_no_project_id")
            return text
            
        return await _run_in_thread(_dlp_deidentify_text, project_id, text)
    except Exception as exc:
        logger.error("dlp_masking_failed", error=str(exc))
        return text
