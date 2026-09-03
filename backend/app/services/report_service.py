import io
import csv
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models.attendance import AttendanceRecord, AttendanceSession, AttendanceStatus, SyncStatus, SessionStatus
from app.models.user import User, Student, Teacher, UserRole
from app.models.academic import Subject, Classroom, Department, Semester, Section, StudentEnrollment
from app.schemas.report import (
    ReportFilter,
    AttendanceReportResponse,
    AttendanceReportRow,
    StudentAnalyticsResponse,
    SubjectAttendanceStat,
    AdminAnalyticsResponse
)
from app.utils.timezone import utc_now

def get_filtered_attendance_records(db: Session, filter_params: ReportFilter) -> AttendanceReportResponse:
    """Queries attendance records with dynamic filters."""
    query = db.query(AttendanceRecord).join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
    
    if filter_params.start_date:
        start_dt = datetime.combine(filter_params.start_date, datetime.min.time())
        query = query.filter(AttendanceRecord.marked_at >= start_dt)
    if filter_params.end_date:
        end_dt = datetime.combine(filter_params.end_date, datetime.max.time())
        query = query.filter(AttendanceRecord.marked_at <= end_dt)
    if filter_params.subject_id:
        query = query.filter(AttendanceRecord.subject_id == filter_params.subject_id)
    if filter_params.student_id:
        query = query.filter(AttendanceRecord.student_id == filter_params.student_id)
    if filter_params.teacher_id:
        query = query.filter(AttendanceSession.teacher_id == filter_params.teacher_id)
    if filter_params.status:
        query = query.filter(AttendanceRecord.status == filter_params.status)
    if filter_params.classroom_id if hasattr(filter_params, 'classroom_id') else None:
        query = query.filter(AttendanceRecord.classroom_id == filter_params.classroom_id)

    records = query.order_by(AttendanceRecord.marked_at.desc()).all()

    rows = []
    present_cnt = 0
    late_cnt = 0
    rejected_cnt = 0

    for r in records:
        if r.status == AttendanceStatus.PRESENT:
            present_cnt += 1
        elif r.status == AttendanceStatus.LATE:
            late_cnt += 1
        elif r.status == AttendanceStatus.REJECTED:
            rejected_cnt += 1

        student = db.query(Student).filter(Student.id == r.student_id).first()
        student_user = db.query(User).filter(User.id == student.user_id).first() if student else None
        subject = db.query(Subject).filter(Subject.id == r.subject_id).first()
        classroom = db.query(Classroom).filter(Classroom.id == r.classroom_id).first()
        
        session = db.query(AttendanceSession).filter(AttendanceSession.id == r.session_id).first()
        teacher = db.query(Teacher).filter(Teacher.id == session.teacher_id).first() if session else None
        teacher_user = db.query(User).filter(User.id == teacher.user_id).first() if teacher else None

        rows.append(AttendanceReportRow(
            attendance_id=r.id,
            marked_at=r.marked_at,
            student_roll=student.student_id if student else "N/A",
            student_name=student_user.full_name if student_user else "N/A",
            subject_code=subject.code if subject else "N/A",
            subject_name=subject.name if subject else "N/A",
            teacher_name=teacher_user.full_name if teacher_user else "N/A",
            classroom=classroom.name if classroom else "N/A",
            status=r.status,
            ble_rssi=r.ble_rssi,
            verification_source=r.verification_source,
            sync_status=r.sync_status
        ))

    return AttendanceReportResponse(
        total_records=len(rows),
        present_count=present_cnt,
        late_count=late_cnt,
        rejected_count=rejected_cnt,
        rows=rows
    )

def generate_attendance_csv(report_data: AttendanceReportResponse) -> str:
    """Generates a CSV string from report data."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Record ID", "Marked Date & Time (UTC)", "Roll Number", "Student Name",
        "Subject Code", "Subject Name", "Teacher", "Classroom", "Status",
        "BLE RSSI (dBm)", "Verification Source", "Sync Status"
    ])
    for row in report_data.rows:
        writer.writerow([
            row.attendance_id,
            row.marked_at.isoformat(),
            row.student_roll,
            row.student_name,
            row.subject_code,
            row.subject_name,
            row.teacher_name,
            row.classroom,
            row.status,
            row.ble_rssi if row.ble_rssi is not None else "",
            row.verification_source,
            row.sync_status
        ])
    return output.getvalue()

def get_student_analytics(db: Session, student_id: str) -> StudentAnalyticsResponse:
    """Calculates student attendance analytics and subject breakdown."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return StudentAnalyticsResponse(
            overall_percentage=0.0,
            total_sessions=0,
            present_count=0,
            late_count=0,
            absent_count=0,
            subject_stats=[],
            recent_records=[],
            low_attendance_warning=False
        )

    # Get subjects in student's semester or enrolled subjects
    subjects = db.query(Subject).filter(Subject.semester_id == student.semester_id).all() if student.semester_id else []
    
    subject_stats: List[SubjectAttendanceStat] = []
    total_conducted_sessions = 0
    total_attended_sessions = 0
    total_present = 0
    total_late = 0

    for sub in subjects:
        # Total sessions for this subject
        sessions_count = db.query(AttendanceSession).filter(
            AttendanceSession.subject_id == sub.id,
            AttendanceSession.semester_id == student.semester_id
        ).count()

        # Attended records
        attended_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.subject_id == sub.id,
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        ).all()

        attended_count = len(attended_records)
        pct = round((attended_count / sessions_count * 100), 1) if sessions_count > 0 else 100.0

        subject_stats.append(SubjectAttendanceStat(
            subject_id=sub.id,
            subject_code=sub.code,
            subject_name=sub.name,
            total_sessions=sessions_count,
            attended_sessions=attended_count,
            percentage=pct
        ))

        total_conducted_sessions += sessions_count
        total_attended_sessions += attended_count

    all_student_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id
    ).order_by(AttendanceRecord.marked_at.desc()).limit(15).all()

    for r in all_student_records:
        if r.status == AttendanceStatus.PRESENT:
            total_present += 1
        elif r.status == AttendanceStatus.LATE:
            total_late += 1

    overall_pct = round((total_attended_sessions / total_conducted_sessions * 100), 1) if total_conducted_sessions > 0 else 100.0
    absent_cnt = max(0, total_conducted_sessions - total_attended_sessions)
    low_warning = overall_pct < 75.0 and total_conducted_sessions > 0

    recent_data = []
    for r in all_student_records:
        sub = db.query(Subject).filter(Subject.id == r.subject_id).first()
        recent_data.append({
            "id": r.id,
            "subject_code": sub.code if sub else "N/A",
            "subject_name": sub.name if sub else "N/A",
            "marked_at": r.marked_at.isoformat(),
            "status": r.status,
            "ble_rssi": r.ble_rssi,
            "sync_status": r.sync_status
        })

    return StudentAnalyticsResponse(
        overall_percentage=overall_pct,
        total_sessions=total_conducted_sessions,
        present_count=total_present,
        late_count=total_late,
        absent_count=absent_cnt,
        subject_stats=subject_stats,
        recent_records=recent_data,
        low_attendance_warning=low_warning
    )

def get_admin_analytics(db: Session) -> AdminAnalyticsResponse:
    """Aggregates high level university analytics for the admin dashboard."""
    total_students = db.query(Student).count()
    total_teachers = db.query(Teacher).count()
    total_subjects = db.query(Subject).count()
    total_classes = db.query(Classroom).count()

    # Today's attendance
    today_start = utc_now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_records = db.query(AttendanceRecord).filter(AttendanceRecord.marked_at >= today_start).all()

    present_today = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    late_today = sum(1 for r in today_records if r.status == AttendanceStatus.LATE)
    rejected_today = sum(1 for r in today_records if r.status == AttendanceStatus.REJECTED)
    total_today = len(today_records)

    pending_sync = db.query(AttendanceRecord).filter(AttendanceRecord.sync_status == SyncStatus.PENDING_SYNC).count()
    sync_failures = db.query(AttendanceRecord).filter(AttendanceRecord.sync_status == SyncStatus.SYNC_FAILED).count()

    # 7-day attendance trend
    trend = []
    for i in range(6, -1, -1):
        day_date = (utc_now() - timedelta(days=i)).date()
        d_start = datetime.combine(day_date, datetime.min.time())
        d_end = datetime.combine(day_date, datetime.max.time())
        day_recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.marked_at >= d_start,
            AttendanceRecord.marked_at <= d_end
        ).all()
        trend.append({
            "date": day_date.strftime("%b %d"),
            "present": sum(1 for r in day_recs if r.status == AttendanceStatus.PRESENT),
            "late": sum(1 for r in day_recs if r.status == AttendanceStatus.LATE),
            "total": len(day_recs)
        })

    # Subject-wise attendance breakdown
    subjects = db.query(Subject).limit(6).all()
    subject_wise = []
    for sub in subjects:
        sub_recs = db.query(AttendanceRecord).filter(AttendanceRecord.subject_id == sub.id).all()
        present = sum(1 for r in sub_recs if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        subject_wise.append({
            "subject": sub.code,
            "name": sub.name,
            "attended": present,
            "total": len(sub_recs) or 1,
            "rate": round((present / (len(sub_recs) or 1)) * 100, 1)
        })

    # Class-wise attendance breakdown
    classrooms = db.query(Classroom).limit(5).all()
    class_wise = []
    for c in classrooms:
        c_recs = db.query(AttendanceRecord).filter(AttendanceRecord.classroom_id == c.id).all()
        class_wise.append({
            "classroom": c.name,
            "capacity": c.capacity,
            "total_marked": len(c_recs)
        })

    return AdminAnalyticsResponse(
        total_students=total_students,
        total_teachers=total_teachers,
        total_subjects=total_subjects,
        total_classes=total_classes,
        total_attendance_today=total_today,
        present_today=present_today,
        late_today=late_today,
        absent_today=max(0, (total_students - total_today) if total_students > 0 else 0),
        pending_sync_count=pending_sync,
        sync_failure_count=sync_failures,
        attendance_trend=trend,
        subject_wise_attendance=subject_wise,
        class_wise_attendance=class_wise,
        status_breakdown={
            "PRESENT": present_today,
            "LATE": late_today,
            "REJECTED": rejected_today,
            "ABSENT": max(0, total_students - total_today)
        }
    )
