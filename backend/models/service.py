from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class ServiceRecordBase(BaseModel):
    product_id: str
    technician_name: str
    service_type: str  # maintenance, repair, inspection
    description: str
    issues_found: Optional[str] = None
    warranty_status: Optional[str] = None  # warranty, non_warranty

class ServiceRecordCreate(ServiceRecordBase):
    service_date: Optional[str] = None

class ServiceRecord(ServiceRecordBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
