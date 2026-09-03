from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    status: str
    entity: Optional[str] = None
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    is_read: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
