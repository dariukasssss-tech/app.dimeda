from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from models.service import ServiceRecordCreate, ServiceRecord
from core.database import db

router = APIRouter(prefix="/services", tags=["services"])

@router.post("", response_model=ServiceRecord)
async def create_service_record(service: ServiceRecordCreate):
    product = await db.products.find_one({"id": service.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    service_data = service.model_dump()
    if not service_data.get("service_date"):
        service_data["service_date"] = datetime.now(timezone.utc).isoformat()
    
    service_obj = ServiceRecord(**service_data)
    doc = service_obj.model_dump()
    await db.services.insert_one(doc)
    return service_obj

@router.get("", response_model=List[ServiceRecord])
async def get_services(product_id: Optional[str] = None):
    query = {"product_id": product_id} if product_id else {}
    services = await db.services.find(query, {"_id": 0}).sort("service_date", -1).to_list(1000)
    return services

@router.get("/{service_id}", response_model=ServiceRecord)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service record not found")
    return service

@router.delete("/{service_id}")
async def delete_service(service_id: str):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service record not found")
    return {"message": "Service record deleted successfully"}
