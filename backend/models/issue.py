from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

class IssueBase(BaseModel):
    product_id: str
    issue_type: str  # mechanical, electrical, cosmetic, other, make_service
    severity: str  # low, medium, high, critical
    title: str
    description: str
    technician_name: Optional[str] = None  # Assigned technician
    warranty_status: Optional[str] = None  # warranty, non_warranty

class IssueCreate(IssueBase):
    photos: Optional[List[str]] = []  # base64 encoded images
    product_location: Optional[str] = None  # Address/location info from customer
    source: Optional[str] = None  # "customer" for customer-reported issues

class RepairAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"  # pending, in_progress, completed

class Issue(IssueBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    issue_code: Optional[str] = None  # Unique code: YYYY_SN_MM_DD_ORDER
    status: str = "open"  # open, in_progress, in_service, resolved
    photos: List[str] = []
    resolution: Optional[str] = None  # Inspection Note (first stage diagnosis)
    service_note: Optional[str] = None  # Service Note (warranty repair completion)
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
    # Spare parts tracking
    spare_parts_used: bool = False
    spare_parts: Optional[str] = None  # List of spare parts used
    # Warranty repair tracking (no child issues)
    warranty_repair_started_at: Optional[str] = None  # When warranty repair was initiated
    repair_attempts: List[RepairAttempt] = []  # Track multiple repair attempts
    current_repair_id: Optional[str] = None  # Currently active repair attempt
    # Legacy fields (kept for backwards compatibility)
    parent_issue_id: Optional[str] = None  # If this is a routed warranty service issue
    child_issue_id: Optional[str] = None  # If this issue has a routed warranty service issue
    is_warranty_route: bool = False  # True if this is a "Make Service" routed issue

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
    # Spare parts tracking
    spare_parts_used: Optional[bool] = None
    spare_parts: Optional[str] = None
    # Service Note (warranty repair completion)
    service_note: Optional[str] = None
    # Repair actions
    start_repair: Optional[bool] = None  # Start a new repair attempt
    complete_repair: Optional[bool] = None  # Complete current repair attempt
    repair_notes: Optional[str] = None  # Notes for current repair
    repair_id: Optional[str] = None  # Specific repair attempt to continue

