from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_student
from app.models.user import User, Student
from app.models.academic import Subject, Classroom, StudentEnrollment
from app.models.timetable import Timetable
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus
from app.models.notification import Notification
from app.schemas.timetable import TimetableResponse
from app.schemas.attendance import AttendanceSessionResponse, AttendanceRecordResponse
from app.schemas.report import StudentAnalyticsResponse
from app.schemas.audit import NotificationResponse
from app.services.report_service import get_student_analytics
from app.utils.timezone import utc_now

router = APIRouter(prefix="/student", tags=["Student Dashboard"], dependencies=[Depends(require_student)])

@router.get("/dashboard", response_model=StudentAnalyticsResponse)
def get_student_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return get_student_analytics(db, student.id)

@router.get("/today-classes", response_model=List[Dict[str, Any]])
def get_student_today_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student or not student.semester_id:
        return []

    today_weekday = utc_now().weekday()
    query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.day_of_week == today_weekday,
        Timetable.is_active == 1
    )
    if student.section_id:
        query = query.filter(Timetable.section_id == student.section_id)
    
    timetables = query.order_by(Timetable.start_time.asc()).all()

    today_classes = []
    for tt in timetables:
        # Check if there is an active session right now for this subject & classroom
        active_session_query = db.query(AttendanceSession).filter(
            AttendanceSession.subject_id == tt.subject_id,
            AttendanceSession.semester_id == tt.semester_id,
            AttendanceSession.status == SessionStatus.ACTIVE,
            AttendanceSession.expiry_time > utc_now()
        )
        if tt.section_id:
            active_session_query = active_session_query.filter(AttendanceSession.section_id == tt.section_id)
        active_session = active_session_query.order_by(AttendanceSession.start_time.desc()).first()

        # Check if student already marked attendance today
        already_marked = None
        if active_session:
            already_marked = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == active_session.id,
                AttendanceRecord.student_id == student.id
            ).first()

        teacher_user = db.query(User).filter(User.id == tt.teacher.user_id).first() if tt.teacher else None

        today_classes.append({
            "timetable_id": tt.id,
            "subject_id": tt.subject.id if tt.subject else "",
            "subject_code": tt.subject.code if tt.subject else "",
            "subject_name": tt.subject.name if tt.subject else "",
            "teacher_name": teacher_user.full_name if teacher_user else "Instructor",
            "classroom_name": tt.classroom.name if tt.classroom else "",
            "classroom_id": tt.classroom.id if tt.classroom else "",
            "ble_identifier": active_session.ble_identifier if active_session else (tt.classroom.ble_identifier if tt.classroom else ""),
            "active_session_token": "valid-ble-proximity-token" if active_session else None,
            "active_session_classroom_id": active_session.classroom_id if active_session else None,
            "active_session_classroom_name": active_session.classroom.name if active_session and active_session.classroom else None,
            "start_time": tt.start_time,
            "end_time": tt.end_time,
            "is_session_active": bool(active_session),
            "active_session_id": active_session.id if active_session else None,
            "already_marked": bool(already_marked),
            "marked_status": already_marked.status if already_marked else None
        })

    return today_classes

@router.get("/schedule", response_model=List[TimetableResponse])
def get_student_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    student = current_user.student_profile
    if not student or not student.semester_id:
        return []
    
    query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.is_active == 1
    )
    if student.section_id:
        query = query.filter(Timetable.section_id == student.section_id)
    return query.order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

@router.get("/notifications", response_model=List[NotificationResponse])
def get_student_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = 1
        db.commit()
    return {"message": "Notification marked as read"}

@router.get("/offline-bundle")
def get_student_offline_bundle(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    """
    Supplies the student mobile app with a complete cacheable snapshot of their
    enrolled courses, weekly timetable, and classroom beacon configurations for offline operations.
    """
    student = current_user.student_profile
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Enrolled subjects
    enrollments = db.query(StudentEnrollment).filter(StudentEnrollment.student_id == student.id).all()
    subject_ids = [e.subject_id for e in enrollments]
    subjects = db.query(Subject).filter(Subject.id.in_(subject_ids)).all() if subject_ids else []

    # Weekly Timetable
    timetable_query = db.query(Timetable).filter(
        Timetable.semester_id == student.semester_id,
        Timetable.is_active == 1
    )
    if student.section_id:
        timetable_query = timetable_query.filter(Timetable.section_id == student.section_id)
    timetables = timetable_query.order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

    # Classrooms
    classrooms = db.query(Classroom).all()

    # Active Sessions for this student's subjects
    active_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.subject_id.in_(subject_ids) if subject_ids else False,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > utc_now()
    ).all()

    return {
        "sync_time": utc_now().isoformat(),
        "student": {
            "id": student.id,
            "user_id": current_user.id,
            "roll_number": student.student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else None,
            "semester_id": student.semester_id,
            "semester_number": student.semester.number if student.semester else None,
            "section_id": student.section_id,
            "section_name": student.section.name if student.section else None
        },
        "subjects": [
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "credits": s.credits
            } for s in subjects
        ],
        "timetable": [
            {
                "id": tt.id,
                "subject_id": tt.subject_id,
                "subject_code": tt.subject.code if tt.subject else "",
                "subject_name": tt.subject.name if tt.subject else "",
                "classroom_id": tt.classroom_id,
                "classroom_name": tt.classroom.name if tt.classroom else "",
                "ble_identifier": tt.classroom.ble_identifier if tt.classroom else "",
                "day_of_week": tt.day_of_week,
                "start_time": tt.start_time,
                "end_time": tt.end_time
            } for tt in timetables
        ],
        "classrooms": [
            {
                "id": c.id,
                "name": c.name,
                "building": c.building,
                "room_number": c.room_number,
                "ble_identifier": c.ble_identifier
            } for c in classrooms
        ],
        "active_sessions": [
            {
                "id": s.id,
                "subject_id": s.subject_id,
                "classroom_id": s.classroom_id,
                "ble_identifier": s.ble_identifier,
                "expiry_time": s.expiry_time.isoformat(),
                "duration_minutes": s.duration_minutes,
                "rssi_threshold": s.rssi_threshold
            } for s in active_sessions
        ]
    }
