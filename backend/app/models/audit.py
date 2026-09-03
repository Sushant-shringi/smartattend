import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.utils.timezone import utc_now

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False, index=True) # LOGIN, ATTENDANCE_MARKED, SESSION_STARTED, etc.
    status = Column(String(20), default="SUCCESS", nullable=False) # SUCCESS, FAILURE, WARNING
    entity = Column(String(50), nullable=True) # User, AttendanceSession, AttendanceRecord, etc.
    entity_id = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")
