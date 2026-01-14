from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timezone, timedelta
from models.product import ProductCreate, Product
from models.maintenance import ScheduledMaintenance
from core.database import db
from core.config import VALID_CITIES

router = APIRouter(prefix="/products", tags=["products"])

@router.post("", response_model=Product)
async def create_product(product: ProductCreate):
    # Validate city
    if product.city not in VALID_CITIES:
        raise HTTPException(status_code=400, detail=f"Invalid city. Must be one of: {', '.join(VALID_CITIES)}")
    
    # Check if serial number already exists
    existing = await db.products.find_one({"serial_number": product.serial_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this serial number already exists")
    
    # Use provided registration date or default to now
    product_data = product.model_dump()
    if product_data.get("registration_date"):
        try:
            reg_date = datetime.fromisoformat(product_data["registration_date"].replace("Z", "+00:00"))
        except:
            reg_date = datetime.strptime(product_data["registration_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    else:
        reg_date = datetime.now(timezone.utc)
        product_data["registration_date"] = reg_date.isoformat()
    
    product_obj = Product(**product_data)
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    
    # Auto-schedule yearly maintenance for 5 years
    for year_offset in range(1, 6):
        maintenance_date = reg_date + timedelta(days=365 * year_offset)
        scheduled_date = maintenance_date.strftime("%Y-%m-%d")
        maintenance_obj = ScheduledMaintenance(
            product_id=product_obj.id,
            scheduled_date=scheduled_date,
            maintenance_type="routine",
            technician_name=None,
            notes=f"Annual maintenance - {product.city}",
            source="auto_yearly",
            priority=None
        )
        await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    
    return product_obj

@router.get("", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for product in products:
        if not product.get("registration_date"):
            product["registration_date"] = datetime.now(timezone.utc).isoformat()
    return products

@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.get("registration_date"):
        product["registration_date"] = datetime.now(timezone.utc).isoformat()
    return product

@router.get("/serial/{serial_number}", response_model=Product)
async def get_product_by_serial(serial_number: str):
    product = await db.products.find_one({"serial_number": serial_number}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.get("registration_date"):
        product["registration_date"] = datetime.now(timezone.utc).isoformat()
    return product

@router.put("/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product.city not in VALID_CITIES:
        raise HTTPException(status_code=400, detail=f"Invalid city. Must be one of: {', '.join(VALID_CITIES)}")
    
    update_data = product.model_dump()
    
    if not update_data.get("registration_date"):
        update_data["registration_date"] = existing.get("registration_date")
    
    old_reg_date = (existing.get("registration_date") or "")[:10]
    new_reg_date = (update_data.get("registration_date") or "")[:10]
    
    if new_reg_date and new_reg_date != old_reg_date:
        try:
            reg_date = datetime.fromisoformat(update_data["registration_date"].replace("Z", "+00:00"))
        except:
            reg_date = datetime.strptime(update_data["registration_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        
        await db.scheduled_maintenance.delete_many({
            "product_id": product_id,
            "source": "auto_yearly"
        })
        
        for year_offset in range(1, 6):
            maintenance_date = reg_date + timedelta(days=365 * year_offset)
            scheduled_date = maintenance_date.strftime("%Y-%m-%d")
            maintenance_obj = ScheduledMaintenance(
                product_id=product_id,
                scheduled_date=scheduled_date,
                maintenance_type="routine",
                technician_name=None,
                notes=f"Annual maintenance - {product.city}",
                source="auto_yearly",
                priority=None
            )
            await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not updated.get("registration_date"):
        updated["registration_date"] = datetime.now(timezone.utc).isoformat()
    return updated

@router.delete("/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
