from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel

class ReportFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    section_id: Optional[str] = None
    subject_id: Optional[str] = None
    teacher_id: Optional[str] = None
    student_id: Optional[str] = None
    status: Optional[str] = None # PRESENT, LATE, REJECTED, ABSENT

class AttendanceReportRow(BaseModel):
    attendance_id: str
    marked_at: datetime
    student_roll: str
    student_name: str
    subject_code: str
    subject_name: str
    teacher_name: str
    classroom: str
    status: str
    ble_rssi: Optional[int] = None
    verification_source: str
    sync_status: str

class AttendanceReportResponse(BaseModel):
    total_records: int
    present_count: int
    late_count: int
    rejected_count: int
    rows: List[AttendanceReportRow]

class SubjectAttendanceStat(BaseModel):
    subject_id: str
    subject_code: str
    subject_name: str
    total_sessions: int
    attended_sessions: int
    percentage: float

class StudentAnalyticsResponse(BaseModel):
    overall_percentage: float
    total_sessions: int
    present_count: int
    late_count: int
    absent_count: int
    subject_stats: List[SubjectAttendanceStat]
    recent_records: List[Any]
    low_attendance_warning: bool

class AdminAnalyticsResponse(BaseModel):
    total_students: int
    total_teachers: int
    total_subjects: int
    total_classes: int
    total_attendance_today: int
    present_today: int
    late_today: int
    absent_today: int
    pending_sync_count: int
    sync_failure_count: int
    attendance_trend: List[Dict[str, Any]]
    subject_wise_attendance: List[Dict[str, Any]]
    class_wise_attendance: List[Dict[str, Any]]
    status_breakdown: Dict[str, int]
