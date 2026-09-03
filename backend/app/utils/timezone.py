from datetime import datetime, timezone
from typing import Optional, Union

def utc_now() -> datetime:
    """Returns the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)

def ensure_utc(dt: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """
    Ensures that a given datetime object or ISO-formatted string is timezone-aware in UTC.
    If a naive datetime is passed, it is assumed to represent UTC and given the UTC timezone.
    If an offset-aware datetime is passed, it is converted to UTC.
    """
    if dt is None:
        return None
    
    if isinstance(dt, str):
        # Replace trailing Z if present for ISO parsing compatibility
        iso_str = dt.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(iso_str)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            # Fallback for simple date or other formats
            return utc_now()

    if isinstance(dt, datetime):
        if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
            # Naive datetime -> assume UTC
            return dt.replace(tzinfo=timezone.utc)
        # Aware datetime -> convert to UTC
        return dt.astimezone(timezone.utc)

    return None
