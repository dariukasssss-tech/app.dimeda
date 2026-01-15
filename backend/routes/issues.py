from fastapi import APIRouter
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models.issue import IssueCreate, Issue, CustomerIssueCreate, IssueUpdate, RepairAttempt
from models.maintenance import ScheduledMaintenance
from models.service import ServiceRecord
from core.database import db
from core.exceptions import NotFoundError, ValidationError, DatabaseError
from core.logging_config import get_logger
import uuid

logger = get_logger(__name__)

router = APIRouter(prefix="/issues", tags=["issues"])

async def generate_issue_code(product_id: str) -> str:
    """Generate unique issue code: YYYY_SN_MM_DD_ORDER"""
    now = datetime.now(timezone.utc)
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    
    # Get product serial number - use full serial number
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    serial = product.get("serial_number", "UNK") if product else "UNK"
    
    # Get next order number (count issues today + 1)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = (now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
    
    order_count = await db.issues.count_documents({
        "created_at": {"$gte": today_start, "$lt": today_end}
    })
    order_num = order_count  # 0-indexed
    
    # Format: YYYY_SN_MM_DD_ORDER
    return f"{year}_{serial}_{month}_{day}_{order_num}"

@router.post("", response_model=Issue)
async def create_issue(issue: IssueCreate):
    product = await db.products.find_one({"id": issue.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate issue code
    issue_code = await generate_issue_code(issue.product_id)
    
    issue_obj = Issue(**issue.model_dump())
    issue_obj.issue_code = issue_code
    
    # Set technician_assigned_at if technician is provided at creation
    if issue.technician_name:
        issue_obj.technician_assigned_at = datetime.now(timezone.utc).isoformat()
    
    doc = issue_obj.model_dump()
    await db.issues.insert_one(doc)
    
    # Auto-schedule maintenance based on issue type
    now = datetime.now(timezone.utc)
    
    # Get product to check model_type
    product = await db.products.find_one({"id": issue.product_id}, {"_id": 0})
    is_roll_in = product.get("model_type") == "roll_in" if product else False
    
    # For customer issues with technician assigned, create a calendar entry
    # Roll-in Stretchers: Don't auto-schedule, let technician schedule manually
    if issue.source == "customer" and issue.technician_name:
        if is_roll_in:
            # Roll-in: Create entry without scheduled date, status "pending_schedule"
            maintenance_obj = ScheduledMaintenance(
                product_id=issue.product_id,
                scheduled_date=None,  # No auto-scheduled date
                maintenance_type="customer_issue",
                technician_name=issue.technician_name,
                notes=f"Customer Issue: {issue.title} - Roll-in Stretcher (No SLA)",
                source="customer_issue",
                issue_id=issue_obj.id,
                priority=None,  # No priority/SLA for Roll-in
                status="pending_schedule"  # Technician needs to schedule
            )
        else:
            # Powered Stretcher: Auto-schedule with 12h SLA
            sla_deadline = now + timedelta(hours=12)
            maintenance_obj = ScheduledMaintenance(
                product_id=issue.product_id,
                scheduled_date=sla_deadline.isoformat(),
                maintenance_type="customer_issue",
                technician_name=issue.technician_name,
                notes=f"Customer Issue: {issue.title} - SLA: 12h from registration",
                source="customer_issue",
                issue_id=issue_obj.id,
                priority="12h"
            )
        await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    elif issue.issue_type == "electrical":
        scheduled_time = now + timedelta(hours=12)
        maintenance_obj = ScheduledMaintenance(
            product_id=issue.product_id,
            scheduled_date=scheduled_time.isoformat(),
            maintenance_type="issue_replacement",
            notes=f"Spare unit replacement - {issue.title}",
            source="issue",
            issue_id=issue_obj.id,
            priority="12h"
        )
        await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    else:
        inspection_time = now + timedelta(hours=12)
        inspection_obj = ScheduledMaintenance(
            product_id=issue.product_id,
            scheduled_date=inspection_time.isoformat(),
            maintenance_type="issue_inspection",
            notes=f"Inspection for issue - {issue.title}",
            source="issue",
            issue_id=issue_obj.id,
            priority="12h"
        )
        await db.scheduled_maintenance.insert_one(inspection_obj.model_dump())
        
        service_time = now + timedelta(hours=24)
        service_obj = ScheduledMaintenance(
            product_id=issue.product_id,
            scheduled_date=service_time.isoformat(),
            maintenance_type="issue_service",
            notes=f"Service for issue - {issue.title}",
            source="issue",
            issue_id=issue_obj.id,
            priority="24h"
        )
        await db.scheduled_maintenance.insert_one(service_obj.model_dump())
    
    return issue_obj

@router.get("", response_model=List[Issue])
async def get_issues(product_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    issues = await db.issues.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return issues

@router.get("/{issue_id}", response_model=Issue)
async def get_issue(issue_id: str):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.put("/{issue_id}", response_model=Issue)
async def update_issue(issue_id: str, update: IssueUpdate):
    existing = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # When marking as "open", clear the technician assignment
    if update_data.get("status") == "open" and existing.get("technician_name"):
        update_data["technician_name"] = None
        update_data["technician_assigned_at"] = None
        if existing.get("source") == "customer":
            await db.scheduled_maintenance.delete_many({
                "issue_id": issue_id,
                "source": "customer_issue"
            })
    
    # Get product to check model_type for Roll-in Stretchers
    product = await db.products.find_one({"id": existing.get("product_id")}, {"_id": 0})
    is_roll_in = product.get("model_type") == "roll_in" if product else False
    
    # Track when technician was assigned
    if update_data.get("technician_name") and not existing.get("technician_name"):
        update_data["technician_assigned_at"] = datetime.now(timezone.utc).isoformat()
        
        # NOTE: Status stays "open" until technician clicks "Start Work"
        # Do NOT auto-set to "in_progress" here
        
        # Create calendar entry for customer issues
        if existing.get("source") == "customer":
            if is_roll_in:
                # Roll-in Stretcher: No auto-schedule, technician schedules manually
                maintenance_obj = ScheduledMaintenance(
                    product_id=existing["product_id"],
                    scheduled_date=None,  # No auto-scheduled date
                    maintenance_type="customer_issue",
                    technician_name=update_data["technician_name"],
                    notes=f"Customer Issue: {existing.get('title', 'N/A')} - Roll-in Stretcher (No SLA)",
                    source="customer_issue",
                    issue_id=issue_id,
                    priority=None,  # No priority/SLA for Roll-in
                    status="pending_schedule"  # Technician needs to schedule
                )
            else:
                # Powered Stretcher: Auto-schedule with 12h SLA
                created_at = datetime.fromisoformat(existing["created_at"].replace("Z", "+00:00"))
                sla_deadline = created_at + timedelta(hours=12)
                
                maintenance_obj = ScheduledMaintenance(
                    product_id=existing["product_id"],
                    scheduled_date=sla_deadline.isoformat(),
                    maintenance_type="customer_issue",
                    technician_name=update_data["technician_name"],
                    notes=f"Customer Issue: {existing.get('title', 'N/A')} - SLA: 12h from registration",
                    source="customer_issue",
                    issue_id=issue_id,
                    priority="12h"
                )
            await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
        
        # Create calendar entry for warranty service (routed) issues
        if existing.get("is_warranty_route"):
            # Schedule warranty service for 24h from now
            scheduled_time = datetime.now(timezone.utc) + timedelta(hours=24)
            
            maintenance_obj = ScheduledMaintenance(
                product_id=existing["product_id"],
                scheduled_date=scheduled_time.isoformat(),
                maintenance_type="warranty_service",
                technician_name=update_data["technician_name"],
                notes=f"Warranty Service: {existing.get('title', 'N/A')}",
                source="warranty_service",
                issue_id=issue_id,
                priority="24h"
            )
            await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    
    # Handle re-assignment of technician (when technician already assigned)
    if update_data.get("technician_name") and existing.get("technician_name") and update_data.get("technician_name") != existing.get("technician_name"):
        update_data["technician_assigned_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update or create calendar entries for warranty service issues
        if existing.get("is_warranty_route"):
            existing_entry = await db.scheduled_maintenance.find_one(
                {"issue_id": issue_id, "source": "warranty_service"}
            )
            if existing_entry:
                # Update existing entry
                await db.scheduled_maintenance.update_many(
                    {"issue_id": issue_id, "source": "warranty_service"},
                    {"$set": {"technician_name": update_data["technician_name"]}}
                )
            else:
                # Create new entry since none exists
                scheduled_time = datetime.now(timezone.utc) + timedelta(hours=24)
                maintenance_obj = ScheduledMaintenance(
                    product_id=existing["product_id"],
                    scheduled_date=scheduled_time.isoformat(),
                    maintenance_type="warranty_service",
                    technician_name=update_data["technician_name"],
                    notes=f"Warranty Service: {existing.get('title', 'N/A')}",
                    source="warranty_service",
                    issue_id=issue_id,
                    priority="24h"
                )
                await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
        
        # Update existing calendar entries for customer issues
        if existing.get("source") == "customer":
            await db.scheduled_maintenance.update_many(
                {"issue_id": issue_id, "source": "customer_issue"},
                {"$set": {"technician_name": update_data["technician_name"]}}
            )
    
    if update_data.get("status") == "resolved":
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle auto-create service record
    should_create_service = update_data.pop("create_service_record", None)
    
    # Handle repair actions
    start_repair = update_data.pop("start_repair", None)
    complete_repair = update_data.pop("complete_repair", None)
    repair_notes = update_data.pop("repair_notes", None)
    repair_id = update_data.pop("repair_id", None)
    
    # Check if this is a warranty service resolution
    is_warranty_service = update_data.get("warranty_service_type") == "warranty"
    
    # NEW WARRANTY FLOW: No child issues, track repairs on original issue
    if is_warranty_service and update_data.get("status") == "resolved" and not existing.get("is_warranty_route"):
        # Don't mark as resolved yet - mark as "in_service" (Awaiting Repair)
        update_data["status"] = "in_service"
        update_data.pop("resolved_at", None)
        
        # Record warranty repair start time (24h countdown starts from here)
        update_data["warranty_repair_started_at"] = datetime.now(timezone.utc).isoformat()
        
        # Create first repair attempt
        new_repair = {
            "id": str(uuid.uuid4()),
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "notes": update_data.get("resolution", "Warranty repair required"),
            "status": "pending"
        }
        existing_repairs = existing.get("repair_attempts", [])
        existing_repairs.append(new_repair)
        update_data["repair_attempts"] = existing_repairs
        update_data["current_repair_id"] = new_repair["id"]
    
    # Handle starting a repair (Continue button clicked)
    if start_repair and existing.get("status") == "in_service":
        repair_attempts = existing.get("repair_attempts", [])
        current_repair_id = repair_id or existing.get("current_repair_id")
        
        # Find and update the repair attempt
        for repair in repair_attempts:
            if repair["id"] == current_repair_id:
                repair["status"] = "in_progress"
                break
        
        update_data["repair_attempts"] = repair_attempts
        update_data["status"] = "in_progress"
    
    # Handle completing a repair
    if complete_repair:
        repair_attempts = existing.get("repair_attempts", [])
        current_repair_id = repair_id or existing.get("current_repair_id")
        
        # Find and complete the repair attempt
        for repair in repair_attempts:
            if repair["id"] == current_repair_id:
                repair["status"] = "completed"
                repair["completed_at"] = datetime.now(timezone.utc).isoformat()
                if repair_notes:
                    repair["notes"] = repair_notes
                break
        
        update_data["repair_attempts"] = repair_attempts
        update_data["status"] = "resolved"
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
        update_data["current_repair_id"] = None
    
    # LEGACY: Handle old routed warranty issues being resolved
    if existing.get("is_warranty_route") and update_data.get("status") == "resolved":
        parent_id = existing.get("parent_issue_id")
        if parent_id:
            await db.issues.update_one(
                {"id": parent_id},
                {"$set": {
                    "status": "resolved",
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    await db.issues.update_one({"id": issue_id}, {"$set": update_data})
    updated = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    
    # Update maintenance item status when issue is resolved
    if update_data.get("status") == "resolved":
        await db.scheduled_maintenance.update_many(
            {"issue_id": issue_id},
            {"$set": {"status": "completed"}}
        )
    
    # AUTO-RESOLVE PARENT: When a child issue is resolved, check if all siblings are resolved
    if update_data.get("status") == "resolved" and existing.get("parent_issue_id"):
        parent_id = existing.get("parent_issue_id")
        # Find all child issues of this parent
        all_children = await db.issues.find({"parent_issue_id": parent_id}).to_list(length=1000)
        # Check if all children are resolved
        all_resolved = all(child.get("status") == "resolved" for child in all_children)
        if all_resolved and len(all_children) > 0:
            # Auto-resolve the parent issue
            await db.issues.update_one(
                {"id": parent_id},
                {"$set": {
                    "status": "resolved",
                    "resolved_at": datetime.now(timezone.utc).isoformat(),
                    "resolution": updated.get("resolution") or "All child issues resolved"
                }}
            )
            # Also update the parent's maintenance item if exists
            await db.scheduled_maintenance.update_many(
                {"issue_id": parent_id},
                {"$set": {"status": "completed"}}
            )
    
    # Auto-create service record for non-warranty resolved issues
    if should_create_service and update_data.get("status") == "resolved" and update_data.get("warranty_service_type") == "non_warranty":
        service_obj = ServiceRecord(
            product_id=existing["product_id"],
            technician_name=updated.get("technician_name") or existing.get("technician_name") or "Unknown",
            service_type="repair",
            description=f"{existing.get('title', 'Issue')}\n\nResolution: {update_data.get('resolution', 'N/A')}\n\nEstimated Fix Time: {update_data.get('estimated_fix_time', 'N/A')} hours\nEstimated Cost: {update_data.get('estimated_cost', 'N/A')} Eur",
            issues_found=existing.get("description", ""),
            warranty_status="non_warranty",
            service_date=datetime.now(timezone.utc).isoformat(),
        )
        await db.services.insert_one(service_obj.model_dump())
    
    return updated

@router.get("/{issue_id}/track")
async def get_issue_track(issue_id: str):
    """Get full tracking history for an issue including parent/child warranty service issues"""
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    track = {
        "original_issue": None,
        "current_issue": issue,
        "warranty_service_issue": None,
        "is_warranty_flow": False
    }
    
    # If this is a routed warranty service issue, get the parent
    if issue.get("parent_issue_id"):
        parent = await db.issues.find_one({"id": issue["parent_issue_id"]}, {"_id": 0})
        track["original_issue"] = parent
        track["is_warranty_flow"] = True
    
    # If this issue has a child warranty service issue, get it
    if issue.get("child_issue_id"):
        child = await db.issues.find_one({"id": issue["child_issue_id"]}, {"_id": 0})
        track["warranty_service_issue"] = child
        track["original_issue"] = issue
        track["is_warranty_flow"] = True
    
    # Get product info
    product = await db.products.find_one({"id": issue["product_id"]}, {"_id": 0})
    track["product"] = product
    
    return track

@router.delete("/{issue_id}")
async def delete_issue(issue_id: str):
    # First check if issue exists
    existing = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Delete all related scheduled maintenance entries
    await db.scheduled_maintenance.delete_many({"issue_id": issue_id})
    
    # If this is a parent issue with a warranty child, also delete the child
    if existing.get("child_issue_id"):
        child_id = existing["child_issue_id"]
        # Delete child's maintenance entries
        await db.scheduled_maintenance.delete_many({"issue_id": child_id})
        # Delete the child issue
        await db.issues.delete_one({"id": child_id})
    
    # If this is a warranty route (child) issue, update the parent to remove child reference
    if existing.get("parent_issue_id"):
        await db.issues.update_one(
            {"id": existing["parent_issue_id"]},
            {"$unset": {"child_issue_id": ""}}
        )
    
    # Delete the issue itself
    result = await db.issues.delete_one({"id": issue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return {"message": "Issue and related entries deleted successfully"}

@router.post("/customer", response_model=Issue)
async def create_customer_issue(issue: CustomerIssueCreate):
    product = await db.products.find_one({"id": issue.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate issue code
    issue_code = await generate_issue_code(issue.product_id)
    
    issue_data = issue.model_dump()
    issue_data["severity"] = "high"
    issue_data["source"] = "customer"
    issue_data["photos"] = []
    issue_data["issue_code"] = issue_code
    
    issue_obj = Issue(**issue_data)
    doc = issue_obj.model_dump()
    await db.issues.insert_one(doc)
    return issue_obj
