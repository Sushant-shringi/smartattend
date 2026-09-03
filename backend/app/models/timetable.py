import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Time
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.utils.timezone import utc_now

class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = Column(String(36), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    classroom_id = Column(String(36), ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    semester_id = Column(String(36), ForeignKey("semesters.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(String(36), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    
    # 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday
    day_of_week = Column(Integer, nullable=False) 
    start_time = Column(String(10), nullable=False) # e.g. "10:00"
    end_time = Column(String(10), nullable=False)   # e.g. "11:00"
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    teacher = relationship("Teacher", back_populates="timetables")
    subject = relationship("Subject", back_populates="timetables")
    classroom = relationship("Classroom", back_populates="timetables")
    semester = relationship("Semester", back_populates="timetables")
    section = relationship("Section", back_populates="timetables")
