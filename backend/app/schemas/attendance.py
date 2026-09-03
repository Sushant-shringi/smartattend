from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.academic import SubjectResponse, ClassroomResponse, SemesterResponse, SectionResponse

class StartSessionRequest(BaseModel):
    subject_id: str
    classroom_id: str
    semester_id: str
    section_id: str
    duration_minutes: int = 50
    late_threshold_minutes: int = 5
    rssi_threshold: int = -85

class StopSessionRequest(BaseModel):
    session_id: str

class AttendanceSessionResponse(BaseModel):
    id: str
    teacher_id: str
    subject_id: str
    classroom_id: str
    semester_id: str
    section_id: str
    start_time: datetime
    expiry_time: datetime
    duration_minutes: int
    late_threshold_minutes: int
    rssi_threshold: int
    ble_identifier: str
    status: str
    created_at: datetime
    
    raw_session_token: Optional[str] = None
    
    subject: Optional[SubjectResponse] = None
    classroom: Optional[ClassroomResponse] = None
    semester: Optional[SemesterResponse] = None
    section: Optional[SectionResponse] = None

    model_config = ConfigDict(from_attributes=True)

class MarkAttendanceRequest(BaseModel):
    attendance_id: Optional[str] = None
    session_id: str
    subject_id: str
    classroom_id: str
    session_token: str
    ble_rssi: Optional[int] = -65
    device_id: Optional[str] = "web-client"
    marked_at: Optional[datetime] = None
    verification_source: Optional[str] = "BLE"

from app.schemas.user import StudentProfileResponse

class AttendanceRecordResponse(BaseModel):
    id: str
    session_id: str
    student_id: str
    subject_id: str
    classroom_id: str
    marked_at: datetime
    status: str
    ble_rssi: Optional[int] = None
    device_id: Optional[str] = None
    sync_status: str
    synced_at: Optional[datetime] = None
    verification_source: str
    rejection_reason: Optional[str] = None
    created_at: datetime

    session: Optional[AttendanceSessionResponse] = None
    student: Optional[StudentProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)

class LiveStudentAttendanceItem(BaseModel):
    student_id: str
    roll_number: str
    full_name: str
    status: str
    marked_at: Optional[datetime] = None
    ble_rssi: Optional[int] = None
    sync_status: Optional[str] = "SYNCED"

class LiveAttendanceSummary(BaseModel):
    session: AttendanceSessionResponse
    total_enrolled: int
    present_count: int
    late_count: int
    absent_count: int
    attendance_list: List[LiveStudentAttendanceItem]
