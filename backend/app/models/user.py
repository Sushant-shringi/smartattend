import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.utils.timezone import utc_now

class UserRole(str):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"

class UserStatus(str):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), nullable=False, default=UserRole.STUDENT, index=True)
    status = Column(String(20), nullable=False, default=UserStatus.PENDING, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # 1-to-1 relationships
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    qualification = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True, default="Assistant Professor")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    subjects = relationship("TeacherSubject", back_populates="teacher", cascade="all, delete-orphan")
    timetables = relationship("Timetable", back_populates="teacher")
    attendance_sessions = relationship("AttendanceSession", back_populates="teacher")

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = Column(String(50), unique=True, index=True, nullable=False) # Roll number / Registration number
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="SET NULL"), nullable=True)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="student_profile")
    department = relationship("Department", back_populates="students")
    semester = relationship("Semester", back_populates="students")
    section = relationship("Section", back_populates="students")
    enrollments = relationship("StudentEnrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_identifier = Column(String(100), index=True, nullable=False)
    device_model = Column(String(100), nullable=True)
    platform = Column(String(50), nullable=True)
    last_seen = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    user = relationship("User", back_populates="devices")
