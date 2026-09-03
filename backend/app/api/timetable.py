from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_admin, get_current_active_user
from app.models.timetable import Timetable
from app.models.user import User
from app.schemas.timetable import TimetableCreate, TimetableResponse

router = APIRouter(prefix="/timetable", tags=["Timetable"])

@router.get("", response_model=List[TimetableResponse])
def get_timetables(
    teacher_id: Optional[str] = None,
    semester_id: Optional[str] = None,
    section_id: Optional[str] = None,
    day_of_week: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Timetable).filter(Timetable.is_active == 1)
    if teacher_id:
        query = query.filter(Timetable.teacher_id == teacher_id)
    if semester_id:
        query = query.filter(Timetable.semester_id == semester_id)
    if section_id:
        query = query.filter(Timetable.section_id == section_id)
    if day_of_week is not None:
        query = query.filter(Timetable.day_of_week == day_of_week)
    
    return query.order_by(Timetable.day_of_week.asc(), Timetable.start_time.asc()).all()

@router.post("", response_model=TimetableResponse, dependencies=[Depends(require_admin)])
def create_timetable_entry(data: TimetableCreate, db: Session = Depends(get_db)):
    tt = Timetable(
        teacher_id=data.teacher_id,
        subject_id=data.subject_id,
        classroom_id=data.classroom_id,
        semester_id=data.semester_id,
        section_id=data.section_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        is_active=1
    )
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return tt

@router.delete("/{id}", dependencies=[Depends(require_admin)])
def delete_timetable_entry(id: str, db: Session = Depends(get_db)):
    tt = db.query(Timetable).filter(Timetable.id == id).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Timetable entry not found")
    db.delete(tt)
    db.commit()
    return {"message": "Timetable entry deleted"}
