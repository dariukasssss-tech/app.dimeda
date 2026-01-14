from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

class IssueBase(BaseModel):
    product_id: str
    issue_type: str  # mechanical, electrical, cosmetic, other
    severity: str  # low, medium, high, critical
    title: str
    description: str
    technician_name: Optional[str] = None  # Assigned technician
    warranty_status: Optional[str] = None  # warranty, non_warranty

class IssueCreate(IssueBase):
    photos: Optional[List[str]] = []  # base64 encoded images

class Issue(IssueBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_code: Optional[str] = None  # Unique code: YYYY_SN_MM_DD_ORDER
    status: str = "open"  # open, in_progress, resolved
    photos: List[str] = []
    resolution: Optional[str] = None
    technician_name: Optional[str] = None
    technician_assigned_at: Optional[str] = None  # When technician was assigned
    warranty_status: Optional[str] = None
    warranty_service_type: Optional[str] = None  # warranty, non_warranty (set when resolving)
    estimated_fix_time: Optional[str] = None  # For non-warranty
    estimated_cost: Optional[str] = None  # For non-warranty
    product_location: Optional[str] = None  # Address/location info from customer
    source: Optional[str] = None  # "customer" for customer-reported issues
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

class CustomerIssueCreate(BaseModel):
    product_id: str
    issue_type: str
    title: str
    description: str
    product_location: Optional[str] = None  # Address/location info
    warranty_status: Optional[str] = None

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None
    technician_name: Optional[str] = None
    warranty_status: Optional[str] = None
    warranty_service_type: Optional[str] = None  # warranty, non_warranty
    estimated_fix_time: Optional[str] = None  # For non-warranty
    estimated_cost: Optional[str] = None  # For non-warranty
    create_service_record: Optional[bool] = None  # Auto-create service record
