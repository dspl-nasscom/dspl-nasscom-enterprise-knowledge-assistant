"""Google Cloud Storage client — upload ingested documents and return accessible URLs.

The GCS client is pre-initialized at app startup via warm_up_gcs() to avoid
any blocking calls during request handling.

Signing strategy:
  1. Service-account JSON key (GOOGLE_APPLICATION_CREDENTIALS) → v4 signed URL
  2. Cloud Run / GCE attached service account → v4 signed URL via IAM signBlob API
  3. Last resort → token-authenticated download URL (local dev without a key file)
"""

from __future__ import annotations

import datetime
import json
import os
import threading
import urllib.parse
from typing import Optional

import google.auth
import google.auth.transport.requests
from google.auth import iam as google_iam
from google.cloud import storage as gcs
from google.cloud.exceptions import GoogleCloudError
from google.oauth2 import service_account

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_GCS_PREFIX = "kb-documents"
_SIGNED_URL_EXPIRY = datetime.timedelta(hours=1)

# Separate locks to avoid deadlock between credential loading and client init
_cred_lock = threading.Lock()
_client_lock = threading.Lock()

_client: Optional[gcs.Client] = None
_sa_creds: Optional[service_account.Credentials] = None
_sa_creds_loaded = False
_adc_token: str = ""

# Cached IAM-based signing credentials (Cloud Run / GCE path)
_iam_sign_creds: Optional[service_account.Credentials] = None
_iam_sign_creds_loaded = False
_iam_sign_lock = threading.Lock()


# ── Credential loading ────────────────────────────────────────────────────────

def _load_sa_creds() -> Optional[service_account.Credentials]:
    key_path = (
        settings.google_application_credentials
        or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    )
    if not key_path or not os.path.isfile(key_path):
        return None
    try:
        with open(key_path) as f:
            info = json.load(f)
        if info.get("type") != "service_account":
            return None
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/devstorage.read_write"],
        )
        logger.info("gcs_using_service_account_key", email=info.get("client_email"))
        return creds
    except Exception as exc:
        logger.warning("gcs_sa_key_load_failed", error=str(exc)[:200])
        return None


def _get_sa_creds() -> Optional[service_account.Credentials]:
    global _sa_creds, _sa_creds_loaded
    if not _sa_creds_loaded:
        with _cred_lock:
            if not _sa_creds_loaded:
                _sa_creds = _load_sa_creds()
                _sa_creds_loaded = True
    return _sa_creds


def _get_client() -> gcs.Client:
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                sa = _get_sa_creds()
                _client = gcs.Client(credentials=sa) if sa else gcs.Client()
                logger.info("gcs_client_initialised", bucket=settings.gcs_bucket_name)
    return _client


def _blob_path(filename: str) -> str:
    return f"{_GCS_PREFIX}/{filename}"


# ── IAM-based signing (Cloud Run / GCE — no key file) ────────────────────────

def _get_iam_sign_creds() -> Optional[service_account.Credentials]:
    """Build signing credentials using the IAM signBlob API.

    Works on Cloud Run / GCE where a service account is *attached* to the
    instance but no JSON key file is present.  The metadata server supplies
    both the access token (for API calls) and the service-account email
    (used as the signer identity).

    Returns None if we are not running on GCE/Cloud Run or if IAM signing
    is not available.
    """
    global _iam_sign_creds, _iam_sign_creds_loaded
    if _iam_sign_creds_loaded:
        return _iam_sign_creds

    with _iam_sign_lock:
        if _iam_sign_creds_loaded:
            return _iam_sign_creds

        try:
            # Obtain ADC credentials (will use the metadata server on Cloud Run)
            adc_creds, project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            req = google.auth.transport.requests.Request()
            adc_creds.refresh(req)

            # On GCE/Cloud Run, the service_account_email attribute is populated
            sa_email = getattr(adc_creds, "service_account_email", None)
            if not sa_email:
                # Try fetching from the metadata server directly
                import urllib.request as _urllib_req
                meta_url = (
                    "http://metadata.google.internal/computeMetadata/v1/"
                    "instance/service-accounts/default/email"
                )
                meta_req = _urllib_req.Request(meta_url, headers={"Metadata-Flavor": "Google"})
                with _urllib_req.urlopen(meta_req, timeout=2) as resp:
                    sa_email = resp.read().decode().strip()

            if not sa_email:
                raise ValueError("Could not determine service account email")

            # Build an IAM-backed signer
            signer = google_iam.Signer(
                request=req,
                credentials=adc_creds,
                service_account_email=sa_email,
            )
            iam_creds = service_account.Credentials(
                signer=signer,
                service_account_email=sa_email,
                token_uri="https://oauth2.googleapis.com/token",
                scopes=["https://www.googleapis.com/auth/devstorage.read_write"],
            )
            logger.info("gcs_using_iam_signing", email=sa_email)
            _iam_sign_creds = iam_creds
        except Exception as exc:
            logger.warning("gcs_iam_sign_creds_failed", error=str(exc)[:200])
            _iam_sign_creds = None

        _iam_sign_creds_loaded = True
    return _iam_sign_creds


# ── URL generation ────────────────────────────────────────────────────────────

def _make_url(blob: gcs.Blob) -> str:
    """Return the best available signed URL.

    Priority:
      1. SA key file (GOOGLE_APPLICATION_CREDENTIALS) — local dev / explicit key
      2. IAM signBlob API  — Cloud Run / GCE with attached service account
      3. Token-authenticated URL — last resort (short-lived, not a true signed URL)
    """
    # ── Strategy 1: explicit SA key ───────────────────────────────────────────
    sa = _get_sa_creds()
    if sa is not None:
        try:
            return blob.generate_signed_url(
                version="v4",
                expiration=_SIGNED_URL_EXPIRY,
                method="GET",
                credentials=sa,
            )
        except Exception as exc:
            logger.warning("gcs_signed_url_sa_failed", error=str(exc)[:120])

    # ── Strategy 2: IAM-based signing (Cloud Run) ─────────────────────────────
    iam_creds = _get_iam_sign_creds()
    if iam_creds is not None:
        try:
            return blob.generate_signed_url(
                version="v4",
                expiration=_SIGNED_URL_EXPIRY,
                method="GET",
                credentials=iam_creds,
            )
        except Exception as exc:
            logger.warning("gcs_signed_url_iam_failed", error=str(exc)[:120])

    # ── Strategy 3: token URL (last resort) ───────────────────────────────────
    return _token_url(blob.bucket.name, blob.name)


def _token_url(bucket_name: str, blob_name: str) -> str:
    """Token-authenticated download URL using cached ADC token.

    Refreshes the token if it is empty (first call or after expiry reset).
    """
    global _adc_token
    try:
        if not _adc_token:
            creds, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/devstorage.read_only"]
            )
            req = google.auth.transport.requests.Request()
            creds.refresh(req)
            _adc_token = getattr(creds, "token", "")
            logger.debug("gcs_adc_token_refreshed")

        encoded = urllib.parse.quote(blob_name, safe="")
        return (
            f"https://storage.googleapis.com/download/storage/v1/b/"
            f"{bucket_name}/o/{encoded}?alt=media&access_token={_adc_token}"
        )
    except Exception as exc:
        logger.warning("gcs_token_url_failed", error=str(exc)[:200])
        encoded = urllib.parse.quote(blob_name, safe="/")
        return f"https://storage.googleapis.com/{bucket_name}/{encoded}"


def refresh_adc_token() -> None:
    """Force-refresh the cached ADC token.

    Call this from the startup warm-up so the token is always fresh when
    the first query arrives. Token lifetime is ~1 hour.
    """
    global _adc_token
    try:
        creds, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/devstorage.read_only"]
        )
        req = google.auth.transport.requests.Request()
        creds.refresh(req)
        _adc_token = getattr(creds, "token", "")
        logger.info("gcs_adc_token_refreshed")
    except Exception as exc:
        logger.warning("gcs_adc_token_refresh_failed", error=str(exc)[:200])


# ── Startup warm-up ───────────────────────────────────────────────────────────

def warm_up_gcs() -> None:
    """Pre-initialize the GCS client and probe signing credentials at startup."""
    if not settings.gcs_bucket_name:
        logger.info("gcs_not_configured", hint="Set GCS_BUCKET_NAME to enable cloud storage")
        return
    try:
        _get_client()
        if _get_sa_creds() is not None:
            logger.info("gcs_signing_mode", mode="service_account_key")
        else:
            # Try IAM-based signing first (Cloud Run / GCE)
            iam_creds = _get_iam_sign_creds()
            if iam_creds is not None:
                logger.info("gcs_signing_mode", mode="iam_signblob")
            else:
                # Fall back to short-lived ADC token URLs
                refresh_adc_token()
                logger.info("gcs_signing_mode", mode="adc_token_url")
        logger.info("gcs_ready", bucket=settings.gcs_bucket_name)
    except Exception as exc:
        logger.warning("gcs_warmup_failed", error=str(exc)[:200],
                       hint="GCS upload will be skipped; ingestion will still work")


# ── Public API ────────────────────────────────────────────────────────────────

def upload_file(file_path: str, destination_filename: str) -> str:
    """Upload a file to GCS and return an accessible URL.

    Raises RuntimeError if GCS_BUCKET_NAME is not set.
    """
    bucket_name = settings.gcs_bucket_name
    if not bucket_name:
        raise RuntimeError("GCS_BUCKET_NAME is not set.")

    client = _get_client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(_blob_path(destination_filename))

    logger.info("gcs_upload_start", file=destination_filename, bucket=bucket_name)
    try:
        blob.upload_from_filename(file_path)
    except GoogleCloudError as exc:
        logger.error("gcs_upload_failed", file=destination_filename, error=str(exc))
        raise

    url = f"https://storage.googleapis.com/{bucket_name}/{blob.name}"
    logger.info("gcs_upload_done", file=destination_filename)
    return url


def get_signed_url(destination_filename: str) -> str:
    """Return a fresh URL for an already-uploaded file. Returns '' if not configured."""
    bucket_name = settings.gcs_bucket_name
    if not bucket_name:
        return ""
    try:
        client = _get_client()
        blob = client.bucket(bucket_name).blob(_blob_path(destination_filename))
        return _make_url(blob)
    except Exception as exc:
        logger.warning("gcs_url_failed", file=destination_filename, error=str(exc)[:200])
        return ""


def delete_file(destination_filename: str) -> None:
    """Delete a file from GCS. Silently ignores 404."""
    bucket_name = settings.gcs_bucket_name
    if not bucket_name:
        return
    try:
        client = _get_client()
        client.bucket(bucket_name).blob(_blob_path(destination_filename)).delete()
        logger.info("gcs_delete_done", file=destination_filename)
    except GoogleCloudError as exc:
        if "404" not in str(exc):
            logger.warning("gcs_delete_failed", file=destination_filename, error=str(exc))
