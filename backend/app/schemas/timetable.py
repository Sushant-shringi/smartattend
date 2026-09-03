from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.academic import SubjectResponse, ClassroomResponse, SemesterResponse, SectionResponse
from app.schemas.user import UserDetailResponse

class TeacherMini(BaseModel):
    id: str
    user: Optional[UserDetailResponse] = None
    employee_id: str

    model_config = ConfigDict(from_attributes=True)

class TimetableCreate(BaseModel):
    teacher_id: str
    subject_id: str
    classroom_id: str
    semester_id: str
    section_id: str
    day_of_week: int # 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
    start_time: str  # "10:00"
    end_time: str    # "11:00"

class TimetableResponse(BaseModel):
    id: str
    teacher_id: str
    subject_id: str
    classroom_id: str
    semester_id: str
    section_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_active: int
    created_at: datetime
    
    subject: Optional[SubjectResponse] = None
    classroom: Optional[ClassroomResponse] = None
    semester: Optional[SemesterResponse] = None
    section: Optional[SectionResponse] = None
    teacher: Optional[TeacherMini] = None

    model_config = ConfigDict(from_attributes=True)
