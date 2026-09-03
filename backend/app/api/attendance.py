from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_teacher, require_student, get_current_active_user
from app.models.user import User
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus, SyncStatus
from app.schemas.attendance import (
    StartSessionRequest,
    AttendanceSessionResponse,
    MarkAttendanceRequest,
    AttendanceRecordResponse,
    LiveAttendanceSummary,
    LiveStudentAttendanceItem
)
from app.services.attendance_service import (
    start_attendance_session,
    stop_attendance_session,
    validate_and_record_attendance
)
from app.utils.timezone import utc_now

router = APIRouter(prefix="/attendance", tags=["Attendance Management"])

@router.post("/sessions", response_model=AttendanceSessionResponse)
def start_session(
    body: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    if not current_user.teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile not found")
    
    session, raw_token = start_attendance_session(
        db=db,
        teacher_id=current_user.teacher_profile.id,
        subject_id=body.subject_id,
        classroom_id=body.classroom_id,
        semester_id=body.semester_id,
        section_id=body.section_id,
        duration_minutes=body.duration_minutes,
        late_threshold_minutes=body.late_threshold_minutes,
        rssi_threshold=body.rssi_threshold
    )
    
    response_data = AttendanceSessionResponse.model_validate(session)
    response_data.raw_session_token = raw_token
    return response_data

@router.post("/sessions/{session_id}/stop", response_model=AttendanceSessionResponse)
def stop_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    if not current_user.teacher_profile:
        raise HTTPException(status_code=403, detail="Teacher profile not found")
    session = stop_attendance_session(db, session_id, current_user.teacher_profile.id)
    return session

@router.get("/sessions/active", response_model=Optional[AttendanceSessionResponse])
def get_active_session_for_teacher(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    if not current_user.teacher_profile:
        return None
    session = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == current_user.teacher_profile.id,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > utc_now()
    ).first()
    return session

@router.get("/sessions/{session_id}", response_model=AttendanceSessionResponse)
def get_session_by_id(session_id: str, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    return session

@router.post("/mark", response_model=AttendanceRecordResponse)
def mark_attendance(
    body: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    if not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Student profile not found")
    
    record, is_duplicate = validate_and_record_attendance(
        db=db,
        student_id=current_user.student_profile.id,
        session_id=body.session_id,
        subject_id=body.subject_id,
        classroom_id=body.classroom_id,
        session_token=body.session_token,
        ble_rssi=body.ble_rssi,
        device_id=body.device_id,
        marked_at_input=body.marked_at,
        verification_source=body.verification_source or "BLE",
        client_attendance_id=body.attendance_id,
        sync_status=SyncStatus.SYNCED
    )
    return record

@router.get("/history", response_model=List[AttendanceRecordResponse])
def get_my_attendance_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.student_profile:
        return db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == current_user.student_profile.id
        ).order_by(AttendanceRecord.marked_at.desc()).limit(limit).all()
    elif current_user.teacher_profile:
        return db.query(AttendanceRecord).join(AttendanceSession).filter(
            AttendanceSession.teacher_id == current_user.teacher_profile.id
        ).order_by(AttendanceRecord.marked_at.desc()).limit(limit).all()
    else:
        return db.query(AttendanceRecord).order_by(AttendanceRecord.marked_at.desc()).limit(limit).all()
