from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from models.maintenance import ScheduledMaintenanceCreate, ScheduledMaintenance, ScheduledMaintenanceUpdate
from core.database import db

router = APIRouter(prefix="/scheduled-maintenance", tags=["maintenance"])

@router.post("", response_model=ScheduledMaintenance)
async def create_scheduled_maintenance(maintenance: ScheduledMaintenanceCreate):
    product = await db.products.find_one({"id": maintenance.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    maintenance_obj = ScheduledMaintenance(**maintenance.model_dump())
    doc = maintenance_obj.model_dump()
    await db.scheduled_maintenance.insert_one(doc)
    return maintenance_obj

@router.get("", response_model=List[ScheduledMaintenance])
async def get_scheduled_maintenance(
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    include_pending: Optional[bool] = True
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        # Include items with scheduled_date in range OR pending_schedule items (no date)
        if include_pending:
            query["$or"] = [
                {"scheduled_date": {"$gte": start_date, "$lt": end_date}},
                {"scheduled_date": None, "status": "pending_schedule"}
            ]
        else:
            query["scheduled_date"] = {"$gte": start_date, "$lt": end_date}
    elif year:
        if include_pending:
            query["$or"] = [
                {"scheduled_date": {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}},
                {"scheduled_date": None, "status": "pending_schedule"}
            ]
        else:
            query["scheduled_date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    maintenance = await db.scheduled_maintenance.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)
    return maintenance

@router.get("/upcoming/count")
async def get_upcoming_maintenance_count():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    next_30_days = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    
    upcoming = await db.scheduled_maintenance.count_documents({
        "status": "scheduled",
        "scheduled_date": {"$gte": today, "$lte": next_30_days}
    })
    
    overdue = await db.scheduled_maintenance.count_documents({
        "status": "scheduled",
        "scheduled_date": {"$lt": today}
    })
    
    return {"upcoming": upcoming, "overdue": overdue}

@router.get("/upcoming/list")
async def get_upcoming_maintenance_list():
    """Get detailed list of upcoming maintenance within 30 days"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    next_30_days = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    
    upcoming = await db.scheduled_maintenance.find({
        "status": "scheduled",
        "scheduled_date": {"$gte": today, "$lte": next_30_days}
    }, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    
    return upcoming

@router.get("/overdue/list")
async def get_overdue_maintenance_list():
    """Get detailed list of overdue maintenance"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    overdue = await db.scheduled_maintenance.find({
        "status": "scheduled",
        "scheduled_date": {"$lt": today}
    }, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    
    return overdue

@router.get("/this-month/list")
async def get_this_month_maintenance_list():
    """Get detailed list of this month's scheduled maintenance"""
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1).strftime("%Y-%m-%d")
    
    # Calculate end of month
    if now.month == 12:
        end_of_month = f"{now.year + 1}-01-01"
    else:
        end_of_month = f"{now.year}-{now.month + 1:02d}-01"
    
    this_month = await db.scheduled_maintenance.find({
        "status": "scheduled",
        "scheduled_date": {"$gte": start_of_month, "$lt": end_of_month}
    }, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    
    return this_month

@router.get("/{maintenance_id}", response_model=ScheduledMaintenance)
async def get_scheduled_maintenance_by_id(maintenance_id: str):
    maintenance = await db.scheduled_maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Scheduled maintenance not found")
    return maintenance

@router.put("/{maintenance_id}", response_model=ScheduledMaintenance)
async def update_scheduled_maintenance(maintenance_id: str, update: ScheduledMaintenanceUpdate):
    existing = await db.scheduled_maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Scheduled maintenance not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.scheduled_maintenance.update_one({"id": maintenance_id}, {"$set": update_data})
    updated = await db.scheduled_maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    return updated

@router.delete("/{maintenance_id}")
async def delete_scheduled_maintenance(maintenance_id: str):
    result = await db.scheduled_maintenance.delete_one({"id": maintenance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled maintenance not found")
    return {"message": "Scheduled maintenance deleted successfully"}
