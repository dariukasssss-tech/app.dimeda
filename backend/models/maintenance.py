from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
import uuid
from datetime import datetime, timezone

class ScheduledMaintenanceBase(BaseModel):
    product_id: str
    scheduled_date: str  # ISO date string
    maintenance_type: str  # routine, inspection, calibration, issue_inspection, issue_service, issue_replacement
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    source: str = "manual"  # manual, auto_yearly, issue
    issue_id: Optional[str] = None  # Link to issue if from issue
    priority: Optional[str] = None  # 12h, 24h for issue-based tasks

class ScheduledMaintenanceCreate(ScheduledMaintenanceBase):
    pass

class ScheduledMaintenance(ScheduledMaintenanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "scheduled"  # scheduled, in_progress, completed, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class ScheduledMaintenanceUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    maintenance_type: Optional[str] = None
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
