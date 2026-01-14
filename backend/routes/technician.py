from fastapi import APIRouter, HTTPException
from models.technician import TechnicianUnavailable
from core.database import db

router = APIRouter(prefix="/technician-unavailable", tags=["technician"])

@router.get("/{technician_name}")
async def get_technician_unavailable_days(technician_name: str):
    days = await db.technician_unavailable.find({"technician_name": technician_name}, {"_id": 0}).to_list(1000)
    return days

@router.post("")
async def add_technician_unavailable_day(data: TechnicianUnavailable):
    existing = await db.technician_unavailable.find_one({
        "technician_name": data.technician_name,
        "date": data.date
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Day already marked as unavailable")
    
    await db.technician_unavailable.insert_one(data.model_dump())
    return {"message": "Unavailable day added", "data": data.model_dump()}

@router.delete("/{technician_name}/{date}")
async def remove_technician_unavailable_day(technician_name: str, date: str):
    result = await db.technician_unavailable.delete_one({
        "technician_name": technician_name,
        "date": date
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unavailable day not found")
    return {"message": "Unavailable day removed"}
