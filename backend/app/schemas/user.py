from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class DepartmentMini(BaseModel):
    id: str
    name: str
    code: str
    model_config = ConfigDict(from_attributes=True)

class SemesterMini(BaseModel):
    id: str
    number: int
    academic_year: str
    model_config = ConfigDict(from_attributes=True)

class SectionMini(BaseModel):
    id: str
    name: str
    model_config = ConfigDict(from_attributes=True)

class TeacherProfileResponse(BaseModel):
    id: str
    user_id: str
    employee_id: str
    department_id: Optional[str] = None
    qualification: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[DepartmentMini] = None
    model_config = ConfigDict(from_attributes=True)

class StudentProfileResponse(BaseModel):
    id: str
    user_id: str
    student_id: str
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    section_id: Optional[str] = None
    department: Optional[DepartmentMini] = None
    semester: Optional[SemesterMini] = None
    section: Optional[SectionMini] = None
    model_config = ConfigDict(from_attributes=True)

class UserDetailResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    teacher_profile: Optional[TeacherProfileResponse] = None
    student_profile: Optional[StudentProfileResponse] = None
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserDetailResponse
    model_config = ConfigDict(from_attributes=True)

class RefreshRequest(BaseModel):
    refresh_token: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TeacherRegisterRequest(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    phone: Optional[str] = None
    employee_id: str
    department_id: Optional[str] = None
    qualification: Optional[str] = None
    designation: Optional[str] = "Assistant Professor"
    password: str = Field(..., min_length=6)

class StudentRegisterRequest(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    student_id: str
    phone: Optional[str] = None
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    section_id: Optional[str] = None
    password: str = Field(..., min_length=6)

class TeacherApprovalRequest(BaseModel):
    department_id: Optional[str] = None
    designation: Optional[str] = "Assistant Professor"

class StudentApprovalRequest(BaseModel):
    department_id: str
    semester_id: str
    section_id: str

class UserStatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None
