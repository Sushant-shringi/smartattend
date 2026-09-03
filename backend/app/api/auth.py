from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, Teacher, Student, UserRole, UserStatus
from app.schemas.auth import (
    LoginRequest,
    TeacherRegisterRequest,
    StudentRegisterRequest,
    TokenResponse,
    RefreshRequest,
    UserResponse
)
from app.schemas.user import UserDetailResponse
from app.auth.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.auth.dependencies import get_current_user, get_current_active_user
from app.config import settings
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])

def _authenticate_and_issue_tokens(username: str, password: str, db: Session) -> TokenResponse:
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        create_audit_log(
            db=db,
            action="LOGIN_FAILED",
            status="FAILURE",
            message=f"Failed login attempt for username: {username}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval. Please contact support."
        )

    if user.status in [UserStatus.SUSPENDED, UserStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account is {user.status.lower()}. Please contact administrator."
        )

    access_token = create_access_token(data={"sub": user.id, "role": user.role, "username": user.username})
    refresh_token = create_refresh_token(data={"sub": user.id, "role": user.role})

    create_audit_log(
        db=db,
        action="LOGIN",
        status="SUCCESS",
        user_id=user.id,
        entity="User",
        entity_id=user.id,
        message=f"User {user.username} logged in successfully"
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user
    )

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Standard JSON login endpoint for web frontend, mobile apps, and direct API callers."""
    return _authenticate_and_issue_tokens(request.username, request.password, db)

@router.post("/token", response_model=TokenResponse, include_in_schema=True)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password form endpoint used automatically by Swagger UI's Authorize dialog."""
    return _authenticate_and_issue_tokens(form_data.username, form_data.password, db)

@router.post("/register/teacher", response_model=UserDetailResponse)
def register_teacher(request: TeacherRegisterRequest, db: Session = Depends(get_db)):
    # Validate uniqueness
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Teacher).filter(Teacher.employee_id == request.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    user = User(
        username=request.username,
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name,
        phone=request.phone,
        role=UserRole.TEACHER,
        status=UserStatus.PENDING # Requires Admin approval
    )
    db.add(user)
    db.flush()

    teacher = Teacher(
        user_id=user.id,
        employee_id=request.employee_id,
        department_id=request.department_id,
        qualification=request.qualification,
        designation=request.designation
    )
    db.add(teacher)
    db.commit()
    db.refresh(user)

    create_audit_log(
        db=db,
        action="TEACHER_REGISTERED",
        user_id=user.id,
        entity="Teacher",
        entity_id=teacher.id,
        message=f"Teacher registered: {user.full_name} ({teacher.employee_id}) - Pending approval"
    )

    return user

@router.post("/register/student", response_model=UserDetailResponse)
def register_student(request: StudentRegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Student).filter(Student.student_id == request.student_id).first():
        raise HTTPException(status_code=400, detail="Student ID / Roll Number already registered")

    user = User(
        username=request.username,
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name,
        phone=request.phone,
        role=UserRole.STUDENT,
        status=UserStatus.PENDING # Requires Admin approval
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        student_id=request.student_id,
        department_id=request.department_id,
        semester_id=request.semester_id,
        section_id=request.section_id
    )
    db.add(student)
    db.commit()
    db.refresh(user)

    create_audit_log(
        db=db,
        action="STUDENT_REGISTERED",
        user_id=user.id,
        entity="Student",
        entity_id=student.id,
        message=f"Student registered: {user.full_name} ({student.student_id}) - Pending approval"
    )

    return user

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(request.refresh_token, settings.REFRESH_SECRET_KEY)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")

    new_access_token = create_access_token(data={"sub": user.id, "role": user.role, "username": user.username})
    new_refresh_token = create_refresh_token(data={"sub": user.id, "role": user.role})

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=user
    )

@router.post("/logout")
def logout(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    create_audit_log(
        db=db,
        action="LOGOUT",
        user_id=current_user.id,
        entity="User",
        entity_id=current_user.id,
        message=f"User {current_user.username} logged out"
    )
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserDetailResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return current_user
