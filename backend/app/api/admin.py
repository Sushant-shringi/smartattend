from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_admin
from app.models.user import User, Teacher, Student, UserRole, UserStatus
from app.models.academic import Department, Semester, Section, Subject, Classroom, TeacherSubject, StudentEnrollment
from app.models.attendance import AttendanceRecord, AttendanceSession
from app.models.audit import AuditLog
from app.schemas.user import UserDetailResponse, TeacherApprovalRequest, StudentApprovalRequest, UserStatusUpdateRequest
from app.schemas.academic import TeacherSubjectAssignRequest, StudentEnrollmentRequest
from app.schemas.report import AdminAnalyticsResponse, AttendanceReportResponse, ReportFilter
from app.schemas.audit import AuditLogResponse
from app.services.report_service import get_admin_analytics, get_filtered_attendance_records, generate_attendance_csv
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/admin", tags=["Admin Management"], dependencies=[Depends(require_admin)])

@router.get("/dashboard", response_model=AdminAnalyticsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    return get_admin_analytics(db)

# --- Teacher Management ---
@router.get("/teacher-requests", response_model=List[UserDetailResponse])
def get_pending_teacher_requests(db: Session = Depends(get_db)):
    return db.query(User).filter(
        User.role == UserRole.TEACHER,
        User.status == UserStatus.PENDING
    ).order_by(User.created_at.desc()).all()

@router.post("/teachers/{user_id}/approve", response_model=UserDetailResponse)
def approve_teacher(
    user_id: str,
    request: Optional[TeacherApprovalRequest] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.TEACHER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher user not found")
    
    user.status = UserStatus.ACTIVE
    if request and user.teacher_profile:
        if request.department_id:
            user.teacher_profile.department_id = request.department_id
        if request.designation:
            user.teacher_profile.designation = request.designation
    
    db.commit()
    db.refresh(user)

    create_audit_log(
        db=db,
        action="TEACHER_APPROVED",
        user_id=admin.id,
        entity="Teacher",
        entity_id=user.teacher_profile.id if user.teacher_profile else user.id,
        message=f"Admin {admin.username} approved teacher {user.full_name}"
    )
    return user

@router.post("/teachers/{user_id}/reject", response_model=UserDetailResponse)
def reject_teacher(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.TEACHER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher user not found")
    user.status = UserStatus.REJECTED
    db.commit()
    db.refresh(user)

    create_audit_log(
        db=db,
        action="TEACHER_REJECTED",
        user_id=admin.id,
        entity="Teacher",
        entity_id=user.id,
        message=f"Admin {admin.username} rejected teacher signup {user.full_name}"
    )
    return user

@router.post("/teachers/{user_id}/status", response_model=UserDetailResponse)
def update_teacher_status(
    user_id: str,
    body: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.TEACHER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")
    user.status = body.status
    db.commit()
    db.refresh(user)
    return user

@router.get("/teachers", response_model=List[UserDetailResponse])
def get_all_teachers(db: Session = Depends(get_db)):
    return db.query(User).filter(User.role == UserRole.TEACHER).order_by(User.created_at.desc()).all()

@router.post("/teachers/assign-subject")
def assign_subject_to_teacher(body: TeacherSubjectAssignRequest, db: Session = Depends(get_db)):
    existing = db.query(TeacherSubject).filter(
        TeacherSubject.teacher_id == body.teacher_id,
        TeacherSubject.subject_id == body.subject_id
    ).first()
    if existing:
        return {"message": "Subject already assigned to teacher"}
    
    ts = TeacherSubject(teacher_id=body.teacher_id, subject_id=body.subject_id)
    db.add(ts)
    db.commit()
    return {"message": "Subject assigned successfully"}

# --- Student Management ---
@router.get("/student-requests", response_model=List[UserDetailResponse])
def get_pending_student_requests(db: Session = Depends(get_db)):
    return db.query(User).filter(
        User.role == UserRole.STUDENT,
        User.status == UserStatus.PENDING
    ).order_by(User.created_at.desc()).all()

@router.post("/students/{user_id}/approve", response_model=UserDetailResponse)
def approve_student(
    user_id: str,
    request: StudentApprovalRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.STUDENT).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student user not found")
    
    user.status = UserStatus.ACTIVE
    if user.student_profile:
        user.student_profile.department_id = request.department_id
        user.student_profile.semester_id = request.semester_id
        user.student_profile.section_id = request.section_id
    
    db.commit()
    db.refresh(user)

    # Auto-enroll in all active subjects for this semester
    semester_subjects = db.query(Subject).filter(Subject.semester_id == request.semester_id).all()
    for sub in semester_subjects:
        enroll_exist = db.query(StudentEnrollment).filter(
            StudentEnrollment.student_id == user.student_profile.id,
            StudentEnrollment.subject_id == sub.id
        ).first()
        if not enroll_exist:
            db.add(StudentEnrollment(
                student_id=user.student_profile.id,
                subject_id=sub.id,
                semester_id=request.semester_id
            ))
    db.commit()

    create_audit_log(
        db=db,
        action="STUDENT_APPROVED",
        user_id=admin.id,
        entity="Student",
        entity_id=user.student_profile.id if user.student_profile else user.id,
        message=f"Admin {admin.username} approved student {user.full_name} and assigned semester"
    )
    return user

@router.post("/students/{user_id}/reject", response_model=UserDetailResponse)
def reject_student(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.STUDENT).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student user not found")
    user.status = UserStatus.REJECTED
    db.commit()
    db.refresh(user)

    create_audit_log(
        db=db,
        action="STUDENT_REJECTED",
        user_id=admin.id,
        entity="Student",
        entity_id=user.id,
        message=f"Admin {admin.username} rejected student signup {user.full_name}"
    )
    return user

@router.post("/students/{user_id}/status", response_model=UserDetailResponse)
def update_student_status(
    user_id: str,
    body: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.STUDENT).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    user.status = body.status
    db.commit()
    db.refresh(user)
    return user

@router.get("/students", response_model=List[UserDetailResponse])
def get_all_students(
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User).join(Student, User.id == Student.user_id).filter(User.role == UserRole.STUDENT)
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if semester_id:
        query = query.filter(Student.semester_id == semester_id)
    return query.order_by(User.created_at.desc()).all()

# --- Reports & Audit Logs ---
@router.get("/reports", response_model=AttendanceReportResponse)
def get_attendance_reports(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject_id: Optional[str] = None,
    student_id: Optional[str] = None,
    teacher_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    filter_params = ReportFilter(
        start_date=start_date,
        end_date=end_date,
        subject_id=subject_id,
        student_id=student_id,
        teacher_id=teacher_id,
        status=status
    )
    return get_filtered_attendance_records(db, filter_params)

@router.get("/reports/export-csv")
def export_attendance_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject_id: Optional[str] = None,
    student_id: Optional[str] = None,
    teacher_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    filter_params = ReportFilter(
        start_date=start_date,
        end_date=end_date,
        subject_id=subject_id,
        student_id=student_id,
        teacher_id=teacher_id,
        status=status
    )
    report_data = get_filtered_attendance_records(db, filter_params)
    csv_content = generate_attendance_csv(report_data)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance-report-{date.today().isoformat()}.csv"}
    )

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
