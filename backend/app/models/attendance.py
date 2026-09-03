import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Float, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.utils.timezone import utc_now

class SessionStatus(str):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    STOPPED = "STOPPED"
    EXPIRED = "EXPIRED"

class AttendanceStatus(str):
    PRESENT = "PRESENT"
    LATE = "LATE"
    REJECTED = "REJECTED"
    ABSENT = "ABSENT"

class SyncStatus(str):
    PENDING_SYNC = "PENDING_SYNC"
    SYNCED = "SYNCED"
    SYNC_FAILED = "SYNC_FAILED"

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    
    start_time = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expiry_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=50, nullable=False)
    late_threshold_minutes = Column(Integer, default=5, nullable=False)
    rssi_threshold = Column(Integer, default=-85, nullable=False)
    
    session_token_hash = Column(String(128), nullable=False) # SHA-256 hash of random token
    ble_identifier = Column(String(100), nullable=False)     # BLE advertising payload identifier
    status = Column(String(20), default=SessionStatus.ACTIVE, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    teacher = relationship("Teacher", back_populates="attendance_sessions")
    subject = relationship("Subject", back_populates="attendance_sessions")
    classroom = relationship("Classroom", back_populates="attendance_sessions")
    semester = relationship("Semester", back_populates="attendance_sessions")
    section = relationship("Section", back_populates="attendance_sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4())) # Client generated or server generated UUID
    session_id = Column(String(36), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    
    marked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(String(20), default=AttendanceStatus.PRESENT, nullable=False, index=True)
    ble_rssi = Column(Integer, nullable=True) # Signal strength in dBm, e.g. -65
    device_id = Column(String(100), nullable=True)
    
    sync_status = Column(String(20), default=SyncStatus.SYNCED, nullable=False, index=True)
    synced_at = Column(DateTime(timezone=True), default=utc_now, nullable=True)
    verification_source = Column(String(20), default="BLE", nullable=False) # BLE, MANUAL, QR
    rejection_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uq_session_student_attendance"),)

    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("Student", back_populates="attendance_records")

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True)
    session_id = Column(String(36), nullable=True)
    batch_size = Column(Integer, default=1, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    failure_count = Column(Integer, default=0, nullable=False)
    details = Column(Text, nullable=True) # JSON details of sync outcome
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
