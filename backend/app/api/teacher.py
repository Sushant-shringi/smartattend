from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_teacher
from app.models.user import User, Student
from app.models.academic import Subject, Classroom, TeacherSubject, StudentEnrollment
from app.models.timetable import Timetable
from app.models.attendance import AttendanceSession, AttendanceRecord, SessionStatus, AttendanceStatus
from app.schemas.academic import SubjectResponse
from app.schemas.timetable import TimetableResponse
from app.schemas.attendance import AttendanceSessionResponse, LiveAttendanceSummary, LiveStudentAttendanceItem
from app.schemas.report import AttendanceReportResponse, ReportFilter
from app.services.report_service import get_filtered_attendance_records
from app.utils.timezone import utc_now

router = APIRouter(prefix="/teacher", tags=["Teacher Dashboard"], dependencies=[Depends(require_teacher)])

@router.get("/dashboard")
def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Today's day of week (0 = Mon, 6 = Sun)
    today_weekday = utc_now().weekday()
    today_classes = db.query(Timetable).filter(
        Timetable.teacher_id == teacher.id,
        Timetable.day_of_week == today_weekday,
        Timetable.is_active == 1
    ).order_by(Timetable.start_time.asc()).all()

    # Active session check
    active_session = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > utc_now()
    ).first()

    # Today's attendance stats for this teacher
    today_start = utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_records = db.query(AttendanceRecord).join(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceRecord.marked_at >= today_start
    ).all()

    present_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    late_cnt = sum(1 for r in today_records if r.status == AttendanceStatus.LATE)

    # Total assigned subjects
    assigned_subjects = db.query(TeacherSubject).filter(TeacherSubject.teacher_id == teacher.id).count()

    # Total students across teacher's semesters
    semester_ids = [tt.semester_id for tt in db.query(Timetable).filter(Timetable.teacher_id == teacher.id).all()]
    total_students = db.query(Student).filter(Student.semester_id.in_(semester_ids)).count() if semester_ids else 0

    return {
        "teacher_name": current_user.full_name,
        "employee_id": teacher.employee_id,
        "designation": teacher.designation,
        "assigned_subjects_count": assigned_subjects,
        "total_students": total_students,
        "today_classes_count": len(today_classes),
        "present_today": present_cnt,
        "late_today": late_cnt,
        "active_session": AttendanceSessionResponse.model_validate(active_session) if active_session else None
    }

@router.get("/classes", response_model=List[Dict[str, Any]])
def get_teacher_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    teacher = current_user.teacher_profile
    teacher_subs = db.query(TeacherSubject).filter(TeacherSubject.teacher_id == teacher.id).all()
    
    classes_data = []
    for ts in teacher_subs:
        sub = db.query(Subject).filter(Subject.id == ts.subject_id).first()
        if sub:
            # Count enrolled students
            student_count = db.query(Student).filter(Student.semester_id == sub.semester_id).count()
            # Timetable entries
            timetables = db.query(Timetable).filter(
                Timetable.teacher_id == teacher.id,
                Timetable.subject_id == sub.id
            ).all()

            classes_data.append({
                "subject_id": sub.id,
                "subject_name": sub.name,
                "subject_code": sub.code,
                "credits": sub.credits,
                "semester_number": sub.semester.number if sub.semester else 1,
                "academic_year": sub.semester.academic_year if sub.semester else "2026-2027",
                "student_count": student_count,
                "timetables": [TimetableResponse.model_validate(t) for t in timetables]
            })
    return classes_data

@router.get("/schedule", response_model=List[TimetableResponse])
def get_teacher_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    teacher = current_user.teacher_profile
    return db.query(Timetable).filter(
        Timetable.teacher_id == teacher.id,
        Timetable.is_active == 1
    ).order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

@router.get("/live-attendance/{session_id}", response_model=LiveAttendanceSummary)
def get_live_attendance(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Students in the matching semester/section
    students_query = db.query(Student).filter(Student.semester_id == session.semester_id)
    if session.section_id:
        students_query = students_query.filter(Student.section_id == session.section_id)
    enrolled_students = students_query.all()

    # Marked attendance records for this session
    marked_records = {r.student_id: r for r in db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()}

    items: List[LiveStudentAttendanceItem] = []
    present_cnt = 0
    late_cnt = 0
    absent_cnt = 0

    for s in enrolled_students:
        s_user = db.query(User).filter(User.id == s.user_id).first()
        rec = marked_records.get(s.id)
        
        if rec:
            if rec.status == AttendanceStatus.PRESENT:
                present_cnt += 1
            elif rec.status == AttendanceStatus.LATE:
                late_cnt += 1
            elif rec.status == AttendanceStatus.REJECTED:
                absent_cnt += 1
            items.append(LiveStudentAttendanceItem(
                student_id=s.id,
                roll_number=s.student_id,
                full_name=s_user.full_name if s_user else "Unknown",
                status=rec.status,
                marked_at=rec.marked_at,
                ble_rssi=rec.ble_rssi,
                sync_status=rec.sync_status
            ))
        else:
            absent_cnt += 1
            items.append(LiveStudentAttendanceItem(
                student_id=s.id,
                roll_number=s.student_id,
                full_name=s_user.full_name if s_user else "Unknown",
                status=AttendanceStatus.ABSENT,
                marked_at=None,
                ble_rssi=None,
                sync_status=None
            ))

    return LiveAttendanceSummary(
        session=AttendanceSessionResponse.model_validate(session),
        total_enrolled=len(enrolled_students),
        present_count=present_cnt,
        late_count=late_cnt,
        absent_count=absent_cnt,
        attendance_list=items
    )

@router.get("/reports", response_model=AttendanceReportResponse)
def get_teacher_reports(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    teacher = current_user.teacher_profile
    filter_params = ReportFilter(
        start_date=start_date,
        end_date=end_date,
        subject_id=subject_id,
        teacher_id=teacher.id,
        status=status
    )
    return get_filtered_attendance_records(db, filter_params)

@router.get("/offline-bundle")
def get_teacher_offline_bundle(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher)
):
    """
    Supplies the teacher mobile app with a cacheable bundle of assigned courses,
    timetables, and classroom beacon configurations for launching offline attendance sessions.
    """
    teacher = current_user.teacher_profile
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    teacher_subs = db.query(TeacherSubject).filter(TeacherSubject.teacher_id == teacher.id).all()
    sub_ids = [ts.subject_id for ts in teacher_subs]
    subjects = db.query(Subject).filter(Subject.id.in_(sub_ids)).all() if sub_ids else []

    timetables = db.query(Timetable).filter(
        Timetable.teacher_id == teacher.id,
        Timetable.is_active == 1
    ).order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

    classrooms = db.query(Classroom).all()

    active_session = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceSession.status == SessionStatus.ACTIVE,
        AttendanceSession.expiry_time > utc_now()
    ).first()

    return {
        "sync_time": utc_now().isoformat(),
        "teacher": {
            "id": teacher.id,
            "user_id": current_user.id,
            "employee_id": teacher.employee_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "designation": teacher.designation,
            "department_id": teacher.department_id,
            "department_name": teacher.department.name if teacher.department else None
        },
        "subjects": [
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "credits": s.credits,
                "semester_id": s.semester_id,
                "semester_number": s.semester.number if s.semester else 1
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
                "semester_id": tt.semester_id,
                "section_id": tt.section_id,
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
        "active_session": {
            "id": active_session.id,
            "subject_id": active_session.subject_id,
            "classroom_id": active_session.classroom_id,
            "ble_identifier": active_session.ble_identifier,
            "expiry_time": active_session.expiry_time.isoformat(),
            "duration_minutes": active_session.duration_minutes
        } if active_session else None
    }
