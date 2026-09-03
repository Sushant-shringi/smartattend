from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_admin, get_current_active_user
from app.models.academic import Department, Semester, Section, Subject, Classroom, TeacherSubject, StudentEnrollment
from app.models.user import User
from app.schemas.academic import (
    DepartmentCreate, DepartmentResponse,
    SemesterCreate, SemesterResponse,
    SectionCreate, SectionResponse,
    SubjectCreate, SubjectResponse,
    ClassroomCreate, ClassroomResponse
)

router = APIRouter(prefix="", tags=["Academic Structure"])

# --- Departments ---
@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name.asc()).all()

@router.post("/departments", response_model=DepartmentResponse, dependencies=[Depends(require_admin)])
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    if db.query(Department).filter((Department.name == data.name) | (Department.code == data.code)).first():
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")
    dept = Department(name=data.name, code=data.code.upper())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

# --- Semesters ---
@router.get("/semesters", response_model=List[SemesterResponse])
def list_semesters(department_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Semester)
    if department_id:
        query = query.filter(Semester.department_id == department_id)
    return query.order_by(Semester.number.asc()).all()

@router.post("/semesters", response_model=SemesterResponse, dependencies=[Depends(require_admin)])
def create_semester(data: SemesterCreate, db: Session = Depends(get_db)):
    existing = db.query(Semester).filter(
        Semester.department_id == data.department_id,
        Semester.number == data.number,
        Semester.academic_year == data.academic_year
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Semester number already exists for this department and year")
    sem = Semester(
        department_id=data.department_id,
        number=data.number,
        academic_year=data.academic_year
    )
    db.add(sem)
    db.commit()
    db.refresh(sem)
    return sem

# --- Sections ---
@router.get("/sections", response_model=List[SectionResponse])
def list_sections(semester_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Section)
    if semester_id:
        query = query.filter(Section.semester_id == semester_id)
    return query.order_by(Section.name.asc()).all()

@router.post("/sections", response_model=SectionResponse, dependencies=[Depends(require_admin)])
def create_section(data: SectionCreate, db: Session = Depends(get_db)):
    sec = Section(semester_id=data.semester_id, name=data.name.upper())
    db.add(sec)
    db.commit()
    db.refresh(sec)
    return sec

# --- Subjects ---
@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(
    department_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Subject)
    if department_id:
        query = query.filter(Subject.department_id == department_id)
    if semester_id:
        query = query.filter(Subject.semester_id == semester_id)
    return query.order_by(Subject.code.asc()).all()

@router.post("/subjects", response_model=SubjectResponse, dependencies=[Depends(require_admin)])
def create_subject(data: SubjectCreate, db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.code == data.code).first():
        raise HTTPException(status_code=400, detail="Subject code already exists")
    subject = Subject(
        code=data.code.upper(),
        name=data.name,
        credits=data.credits,
        department_id=data.department_id,
        semester_id=data.semester_id,
        description=data.description
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

# --- Classrooms ---
@router.get("/classrooms", response_model=List[ClassroomResponse])
def list_classrooms(db: Session = Depends(get_db)):
    return db.query(Classroom).order_by(Classroom.room_number.asc()).all()

@router.post("/classrooms", response_model=ClassroomResponse, dependencies=[Depends(require_admin)])
def create_classroom(data: ClassroomCreate, db: Session = Depends(get_db)):
    if db.query(Classroom).filter(Classroom.room_number == data.room_number).first():
        raise HTTPException(status_code=400, detail="Classroom with this room number already exists")
    
    ble_id = data.ble_identifier if data.ble_identifier else f"SMARTATTEND-RM{data.room_number.replace(' ', '')}"
    classroom = Classroom(
        name=data.name,
        building=data.building,
        room_number=data.room_number,
        capacity=data.capacity,
        ble_identifier=ble_id
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom
