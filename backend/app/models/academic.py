import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.utils.timezone import utc_now

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False) # e.g. "MCA", "CSE", "ECE"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    semesters = relationship("Semester", back_populates="department", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="department", cascade="all, delete-orphan")
    teachers = relationship("Teacher", back_populates="department")
    students = relationship("Student", back_populates="department")

class Semester(Base):
    __tablename__ = "semesters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    number = Column(Integer, nullable=False) # e.g. 1, 2, 3, 4
    academic_year = Column(String(20), nullable=False, default="2026-2027") # e.g. "2026-2027"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("department_id", "number", "academic_year", name="uq_department_semester_year"),)

    department = relationship("Department", back_populates="semesters")
    sections = relationship("Section", back_populates="semester", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="semester")
    timetables = relationship("Timetable", back_populates="semester")
    attendance_sessions = relationship("AttendanceSession", back_populates="semester")

class Section(Base):
    __tablename__ = "sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(20), nullable=False) # e.g. "A", "B", "C"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("semester_id", "name", name="uq_semester_section"),)

    semester = relationship("Semester", back_populates="sections")
    students = relationship("Student", back_populates="section")
    timetables = relationship("Timetable", back_populates="section")
    attendance_sessions = relationship("AttendanceSession", back_populates="section")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), unique=True, index=True, nullable=False) # e.g. "MCA201"
    name = Column(String(100), nullable=False) # e.g. "Data Engineering"
    credits = Column(Integer, default=4, nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Integer, default=1, nullable=False) # 1 = Active, 0 = Inactive
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    department = relationship("Department", back_populates="subjects")
    semester = relationship("Semester", back_populates="subjects")
    teachers = relationship("TeacherSubject", back_populates="subject", cascade="all, delete-orphan")
    enrollments = relationship("StudentEnrollment", back_populates="subject", cascade="all, delete-orphan")
    timetables = relationship("Timetable", back_populates="subject")
    attendance_sessions = relationship("AttendanceSession", back_populates="subject")

class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False) # e.g. "Room 204"
    building = Column(String(100), nullable=False) # e.g. "Computing Block"
    room_number = Column(String(20), unique=True, nullable=False) # e.g. "204"
    capacity = Column(Integer, default=60, nullable=False)
    ble_identifier = Column(String(100), unique=True, nullable=False) # e.g. "SMARTATTEND-RM204"
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    timetables = relationship("Timetable", back_populates="classroom")
    attendance_sessions = relationship("AttendanceSession", back_populates="classroom")

class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("teacher_id", "subject_id", name="uq_teacher_subject"),)

    teacher = relationship("Teacher", back_populates="subjects")
    subject = relationship("Subject", back_populates="teachers")

class StudentEnrollment(Base):
    __tablename__ = "student_enrollments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("student_id", "subject_id", name="uq_student_subject"),)

    student = relationship("Student", back_populates="enrollments")
    subject = relationship("Subject", back_populates="enrollments")
