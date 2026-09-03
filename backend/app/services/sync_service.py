import json
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncItemResult
from app.models.attendance import SyncLog, SyncStatus, AttendanceRecord
from app.services.attendance_service import validate_and_record_attendance
from app.services.audit_service import create_audit_log
from app.utils.timezone import utc_now

def process_sync_batch(db: Session, batch: SyncBatchRequest, student_id: str) -> SyncBatchResponse:
    """
    Processes an array of offline attendance records queued by a student.
    Guarantees idempotency and detailed per-record error tracking.
    """
    results: List[SyncItemResult] = []
    success_count = 0
    failure_count = 0
    log_details = []

    for item in batch.items:
        try:
            record, is_duplicate = validate_and_record_attendance(
                db=db,
                student_id=student_id,
                session_id=item.session_id,
                subject_id=item.subject_id,
                classroom_id=item.classroom_id,
                session_token=item.session_token,
                ble_rssi=item.ble_rssi,
                device_id=item.device_id,
                marked_at_input=item.marked_at,
                verification_source=item.verification_source or "BLE",
                client_attendance_id=item.attendance_id,
                sync_status=SyncStatus.SYNCED
            )
            success_count += 1
            msg = "Duplicate sync recognized (already recorded)" if is_duplicate else "Successfully synchronized"
            results.append(SyncItemResult(
                attendance_id=item.attendance_id,
                status=SyncStatus.SYNCED,
                attendance_status=record.status,
                message=msg
            ))
            log_details.append({"id": item.attendance_id, "status": "SYNCED", "record_status": record.status})
        except HTTPException as he:
            failure_count += 1
            results.append(SyncItemResult(
                attendance_id=item.attendance_id,
                status=SyncStatus.SYNC_FAILED,
                attendance_status=None,
                message=he.detail
            ))
            log_details.append({"id": item.attendance_id, "status": "SYNC_FAILED", "error": he.detail})
        except Exception as e:
            failure_count += 1
            results.append(SyncItemResult(
                attendance_id=item.attendance_id,
                status=SyncStatus.SYNC_FAILED,
                attendance_status=None,
                message=f"Sync error: {str(e)}"
            ))
            log_details.append({"id": item.attendance_id, "status": "SYNC_FAILED", "error": str(e)})

    # Persist sync log
    sync_log = SyncLog(
        student_id=student_id,
        batch_size=len(batch.items),
        success_count=success_count,
        failure_count=failure_count,
        details=json.dumps(log_details),
        created_at=utc_now()
    )
    db.add(sync_log)
    db.commit()

    create_audit_log(
        db=db,
        action="ATTENDANCE_SYNCED",
        status="SUCCESS" if failure_count == 0 else ("PARTIAL" if success_count > 0 else "FAILURE"),
        entity="SyncLog",
        entity_id=sync_log.id,
        message=f"Sync batch processed: {success_count} success, {failure_count} failures"
    )

    return SyncBatchResponse(
        total_processed=len(batch.items),
        success_count=success_count,
        failure_count=failure_count,
        results=results
    )
