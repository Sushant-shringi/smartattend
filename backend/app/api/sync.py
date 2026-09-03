from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.models.attendance import AttendanceRecord, SyncStatus, SyncLog
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncStatusResponse
from app.services.sync_service import process_sync_batch

router = APIRouter(prefix="/sync", tags=["Offline Background Sync"], dependencies=[Depends(require_student)])

@router.post("/attendance", response_model=SyncBatchResponse)
def sync_offline_attendance(
    batch: SyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    if not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Student profile required for attendance sync")
    
    return process_sync_batch(db, batch, current_user.student_profile.id)

@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student)
):
    if not current_user.student_profile:
        raise HTTPException(status_code=403, detail="Student profile not found")
    
    student_id = current_user.student_profile.id
    last_log = db.query(SyncLog).filter(SyncLog.student_id == student_id).order_by(SyncLog.created_at.desc()).first()
    synced_count = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.sync_status == SyncStatus.SYNCED
    ).count()

    return SyncStatusResponse(
        last_sync_time=last_log.created_at if last_log else None,
        pending_records_count=0,
        synced_records_count=synced_count
    )
