from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Department Schemas
class DepartmentCreate(BaseModel):
    name: str
    code: str

class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Semester Schemas
class SemesterCreate(BaseModel):
    department_id: str
    number: int
    academic_year: str = "2026-2027"

class SemesterResponse(BaseModel):
    id: str
    department_id: str
    number: int
    academic_year: str
    created_at: datetime
    department: Optional[DepartmentResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Section Schemas
class SectionCreate(BaseModel):
    semester_id: str
    name: str

class SectionResponse(BaseModel):
    id: str
    semester_id: str
    name: str
    created_at: datetime
    semester: Optional[SemesterResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Subject Schemas
class SubjectCreate(BaseModel):
    code: str
    name: str
    credits: int = 4
    department_id: str
    semester_id: str
    description: Optional[str] = None

class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    department_id: str
    semester_id: str
    description: Optional[str] = None
    is_active: int
    created_at: datetime
    department: Optional[DepartmentResponse] = None
    semester: Optional[SemesterResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Classroom Schemas
class ClassroomCreate(BaseModel):
    name: str
    building: str
    room_number: str
    capacity: int = 60
    ble_identifier: Optional[str] = None

class ClassroomResponse(BaseModel):
    id: str
    name: str
    building: str
    room_number: str
    capacity: int
    ble_identifier: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Teacher-Subject & Student-Enrollment Assignment Schemas
class TeacherSubjectAssignRequest(BaseModel):
    teacher_id: str
    subject_id: str

class StudentEnrollmentRequest(BaseModel):
    student_id: str
    subject_id: str
    semester_id: str
