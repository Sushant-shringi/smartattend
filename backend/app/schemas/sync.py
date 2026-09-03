from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class SyncItem(BaseModel):
    attendance_id: str # Client UUID
    session_id: str
    subject_id: str
    classroom_id: str
    session_token: str
    ble_rssi: Optional[int] = -65
    device_id: Optional[str] = "web-client"
    marked_at: datetime
    verification_source: Optional[str] = "BLE"

class SyncBatchRequest(BaseModel):
    items: List[SyncItem]

class SyncItemResult(BaseModel):
    attendance_id: str
    status: str # SYNCED or SYNC_FAILED
    attendance_status: Optional[str] = None # PRESENT, LATE, REJECTED
    message: str

class SyncBatchResponse(BaseModel):
    total_processed: int
    success_count: int
    failure_count: int
    results: List[SyncItemResult]

class SyncStatusResponse(BaseModel):
    last_sync_time: Optional[datetime] = None
    pending_records_count: int = 0
    synced_records_count: int = 0
