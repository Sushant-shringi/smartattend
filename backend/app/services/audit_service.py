from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.utils.timezone import utc_now

def create_audit_log(
    db: Session,
    action: str,
    message: str,
    status: str = "SUCCESS",
    user_id: Optional[str] = None,
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Safely creates an audit log entry in the database."""
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            status=status,
            entity=entity,
            entity_id=entity_id,
            ip_address=ip_address,
            message=message,
            created_at=utc_now()
        )
        db.add(log_entry)
        db.commit()
        return log_entry
    except Exception as e:
        db.rollback()
        # Fallback log creation failure should not crash the main operation
        print(f"[AUDIT LOGGING ERROR]: {e}")
        return None
