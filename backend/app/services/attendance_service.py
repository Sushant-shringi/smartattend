from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus, SyncStatus
from app.models.user import User, Student, UserStatus
from app.models.academic import Subject, Classroom, StudentEnrollment
from app.utils.timezone import utc_now, ensure_utc
from app.utils.qr_ble import verify_session_token, generate_session_token, generate_ble_identifier
from app.config import settings
from app.services.audit_service import create_audit_log

def start_attendance_session(
    db: Session,
    teacher_id: str,
    subject_id: str,
    classroom_id: str,
    semester_id: str,
    section_id: str,
    duration_minutes: int = 50,
    late_threshold_minutes: int = 5,
    rssi_threshold: int = -85
) -> Tuple[AttendanceSession, str]:
    """
    Creates and starts an active attendance session for a teacher.
    Generates a secure raw session token, stores the SHA-256 hash in DB,
    and returns (session, raw_session_token).
    """
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found")
    
    # Check if there is already an active session for this teacher
    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher_id,
        AttendanceSession.status == SessionStatus.ACTIVE
    ).all()
    
    now = utc_now()
    for s in active_sessions:
        if ensure_utc(s.expiry_time) > now:
            s.status = SessionStatus.STOPPED
    db.commit()

    expiry = now + timedelta(minutes=duration_minutes)
    raw_token, token_hash = generate_session_token()
    session_id_temp = str(int(now.timestamp()))
    ble_id = classroom.ble_identifier or generate_ble_identifier(classroom.room_number, session_id_temp)

    session = AttendanceSession(
        teacher_id=teacher_id,
        subject_id=subject_id,
        classroom_id=classroom_id,
        semester_id=semester_id,
        section_id=section_id,
        start_time=now,
        expiry_time=expiry,
        duration_minutes=duration_minutes,
        late_threshold_minutes=late_threshold_minutes,
        rssi_threshold=rssi_threshold,
        session_token_hash=token_hash,
        ble_identifier=ble_id,
        status=SessionStatus.ACTIVE,
        created_at=now
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    create_audit_log(
        db=db,
        action="SESSION_STARTED",
        message=f"Attendance session started for subject {subject_id} in classroom {classroom.name}",
        entity="AttendanceSession",
        entity_id=session.id
    )

    return session, raw_token

def stop_attendance_session(db: Session, session_id: str, teacher_id: str) -> AttendanceSession:
    """Stops an active attendance session."""
    session = db.query(AttendanceSession).filter(
        AttendanceSession.id == session_id,
        AttendanceSession.teacher_id == teacher_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found or unauthorized")
    
    session.status = SessionStatus.STOPPED
    session.expiry_time = utc_now()
    db.commit()
    db.refresh(session)

    create_audit_log(
        db=db,
        action="SESSION_STOPPED",
        message=f"Attendance session {session_id} manually stopped by teacher",
        entity="AttendanceSession",
        entity_id=session.id
    )
    return session

def validate_and_record_attendance(
    db: Session,
    student_id: str,
    session_id: str,
    subject_id: str,
    classroom_id: str,
    session_token: str,
    ble_rssi: Optional[int] = -65,
    device_id: Optional[str] = "web-client",
    marked_at_input: Optional[datetime] = None,
    verification_source: str = "BLE",
    client_attendance_id: Optional[str] = None,
    sync_status: str = SyncStatus.SYNCED
) -> Tuple[AttendanceRecord, bool]:
    """
    Validates attendance against anti-fraud rules and records it.
    Returns (record, is_duplicate).
    Idempotent: If record already exists, returns existing record with is_duplicate=True.
    """
    now = utc_now()
    marked_at = ensure_utc(marked_at_input) if marked_at_input else now

    # 1. Idempotency & Duplicate Check
    if client_attendance_id:
        existing_by_id = db.query(AttendanceRecord).filter(AttendanceRecord.id == client_attendance_id).first()
        if existing_by_id:
            return existing_by_id, True

    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    ).first()
    if existing_record:
        return existing_record, True

    # 2. Student validation
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    
    user = db.query(User).filter(User.id == student.user_id).first()
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Student account is not active")

    # 3. Session validation
    session = None
    if session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()

    if not session and subject_id and classroom_id:
        # Resolve active or matching session for this subject and classroom
        session_query = db.query(AttendanceSession).filter(
            AttendanceSession.subject_id == subject_id,
            AttendanceSession.classroom_id == classroom_id
        )
        # 1. Match current ACTIVE session started by teacher
        session = session_query.filter(AttendanceSession.status == SessionStatus.ACTIVE).order_by(AttendanceSession.start_time.desc()).first()
        if not session:
            # 2. Match session that was active at the time the student marked attendance
            session = session_query.filter(
                AttendanceSession.start_time <= (marked_at + timedelta(minutes=5)),
                AttendanceSession.expiry_time >= (marked_at - timedelta(minutes=15))
            ).order_by(AttendanceSession.start_time.desc()).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="No active or matching attendance session was started by the teacher for this subject and classroom."
        )

    # Check duplicate by client_attendance_id first (exact retry of same payload)
    if client_attendance_id:
        existing_by_id = db.query(AttendanceRecord).filter(AttendanceRecord.id == client_attendance_id).first()
        if existing_by_id:
            return existing_by_id, True
    
    if session.status != SessionStatus.ACTIVE and session.status != SessionStatus.STOPPED:
        raise HTTPException(status_code=400, detail=f"Attendance session is {session.status.lower()}")

    # For stopped sessions, verify that the attendance was marked while the session was active
    if session.status == SessionStatus.STOPPED:
        if marked_at > (session.expiry_time + timedelta(minutes=15)) or marked_at < (session.start_time - timedelta(minutes=5)):
            raise HTTPException(
                status_code=400,
                detail="Attendance timestamp is outside the active session time window. Attendance rejected."
            )

    # 4. Proximity / Token verification
    # Physical classroom BLE proximity verification
    ble_proximity_ok = (
        verification_source == "BLE"
        and ble_rssi is not None
        and ble_rssi >= (session.rssi_threshold or -85)
    )
    token_ok = bool(session_token and verify_session_token(session_token, session.session_token_hash))

    if not token_ok and not ble_proximity_ok:
        create_audit_log(
            db=db,
            action="ATTENDANCE_REJECTED",
            status="FAILURE",
            entity="AttendanceSession",
            entity_id=session.id,
            message=f"Invalid proximity/token submitted by student {student.student_id}"
        )
        raise HTTPException(status_code=400, detail="Invalid session token or unverified proximity. Attendance rejected.")

    # Check duplicate by resolved session.id and student_id
    existing_record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.student_id == student_id
    ).first()
    if existing_record:
        return existing_record, True

    # 5. Anti-Clock Manipulation (Replay / future clock skew)
    time_diff_future = (marked_at - now).total_seconds()
    if time_diff_future > settings.MAX_FUTURE_TIME_SKEW_SECONDS:
        raise HTTPException(status_code=400, detail="Device clock is ahead of server time. Attendance rejected.")

    # 6. BLE RSSI Threshold Check
    effective_rssi = ble_rssi if ble_rssi is not None else -65
    if effective_rssi < session.rssi_threshold:
        create_audit_log(
            db=db,
            action="ATTENDANCE_REJECTED",
            status="FAILURE",
            entity="AttendanceSession",
            entity_id=session.id,
            message=f"Weak BLE signal ({effective_rssi} dBm < {session.rssi_threshold} dBm) for student {student.student_id}"
        )
        raise HTTPException(
            status_code=400,
            detail=f"BLE signal too weak ({effective_rssi} dBm). You are too far from the classroom."
        )

    # 7. Student Enrollment / Semester Validation
    if session.semester_id and student.semester_id and session.semester_id != student.semester_id:
        raise HTTPException(status_code=403, detail="You are not assigned to this class semester.")

    # 8. Compute Attendance Status (PRESENT vs LATE vs REJECTED) with guaranteed UTC awareness
    session_start_utc = ensure_utc(session.start_time)
    session_expiry_utc = ensure_utc(session.expiry_time)
    late_deadline_utc = session_start_utc + timedelta(minutes=session.late_threshold_minutes)

    if marked_at <= late_deadline_utc:
        attendance_status = AttendanceStatus.PRESENT
    elif marked_at <= session_expiry_utc:
        attendance_status = AttendanceStatus.LATE
    elif session.status in (SessionStatus.ACTIVE, SessionStatus.STOPPED):
        # Offline attendance marked during lecture window and synced later
        attendance_status = AttendanceStatus.PRESENT
    else:
        attendance_status = AttendanceStatus.REJECTED

    if attendance_status == AttendanceStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Attendance session has expired. Attendance rejected.")

    # Create new attendance record linked to resolved session.id
    record = AttendanceRecord(
        id=client_attendance_id if client_attendance_id else None,
        session_id=session.id,
        student_id=student_id,
        subject_id=subject_id if subject_id else session.subject_id,
        classroom_id=classroom_id if classroom_id else session.classroom_id,
        marked_at=marked_at,
        status=attendance_status,
        ble_rssi=effective_rssi,
        device_id=device_id,
        sync_status=sync_status,
        synced_at=now if sync_status == SyncStatus.SYNCED else None,
        verification_source=verification_source,
        created_at=now
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    create_audit_log(
        db=db,
        action="ATTENDANCE_MARKED",
        status="SUCCESS",
        entity="AttendanceRecord",
        entity_id=record.id,
        message=f"Attendance marked as {attendance_status} for student {student.student_id} in session {session_id}"
    )

    return record, False
