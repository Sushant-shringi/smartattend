import hashlib
import hmac
import secrets
from typing import Tuple

def generate_session_token() -> Tuple[str, str]:
    """
    Generates a secure random session token and returns (raw_token, token_hash).
    The raw token is transmitted via BLE / session activation payload.
    Only the SHA-256 hash is persisted in the database.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(raw_token)
    return raw_token, token_hash

def hash_session_token(raw_token: str) -> str:
    """Computes SHA-256 hash of a raw session token."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

def verify_session_token(raw_token: str, stored_hash: str) -> bool:
    """Verifies that the raw token matches the stored SHA-256 hash securely using hmac.compare_digest."""
    candidate_hash = hash_session_token(raw_token)
    return hmac.compare_digest(candidate_hash, stored_hash)

def generate_ble_identifier(classroom_code: str, session_id: str) -> str:
    """Generates a standardized BLE advertisement payload identifier."""
    # Format: smartattend:<classroom_code>:<session_id_short>:<salt>
    salt = secrets.token_hex(3).upper()
    clean_code = classroom_code.replace(" ", "").upper()
    short_id = session_id[:8].upper()
    return f"SMARTATTEND-{clean_code}-{short_id}-{salt}"
