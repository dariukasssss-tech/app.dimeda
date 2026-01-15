from fastapi import APIRouter
from typing import List
from datetime import datetime, timezone, timedelta
from models.product import ProductCreate, Product
from models.maintenance import ScheduledMaintenance
from core.database import db
from core.config import VALID_CITIES
from core.exceptions import NotFoundError, ResourceExistsError, InvalidFieldError
from core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/products", tags=["products"])

@router.post("", response_model=Product)
async def create_product(product: ProductCreate):
    # Validate city
    if product.city not in VALID_CITIES:
        raise InvalidFieldError("city", product.city, VALID_CITIES)
    
    # Check if serial number already exists
    existing = await db.products.find_one({"serial_number": product.serial_number}, {"_id": 0})
    if existing:
        raise ResourceExistsError("Product", "serial_number", product.serial_number)
    
    logger.info(f"Creating product with serial number {product.serial_number}")
    
    # Use provided registration date or default to now
    product_data = product.model_dump()
    if product_data.get("registration_date"):
        try:
            reg_date = datetime.fromisoformat(product_data["registration_date"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
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
    
    logger.info(f"Product {product.serial_number} created with ID {product_obj.id}")
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
        raise NotFoundError("Product", product_id)
    if not product.get("registration_date"):
        product["registration_date"] = datetime.now(timezone.utc).isoformat()
    return product

@router.get("/serial/{serial_number}", response_model=Product)
async def get_product_by_serial(serial_number: str):
    product = await db.products.find_one({"serial_number": serial_number}, {"_id": 0})
    if not product:
        raise NotFoundError("Product", serial_number, "Product with this serial number not found")
    if not product.get("registration_date"):
        product["registration_date"] = datetime.now(timezone.utc).isoformat()
    return product

@router.put("/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise NotFoundError("Product", product_id)
    
    if product.city not in VALID_CITIES:
        raise InvalidFieldError("city", product.city, VALID_CITIES)
    
    logger.info(f"Updating product {product_id}")
    
    update_data = product.model_dump()
    
    if not update_data.get("registration_date"):
        update_data["registration_date"] = existing.get("registration_date")
    
    old_reg_date = (existing.get("registration_date") or "")[:10]
    new_reg_date = (update_data.get("registration_date") or "")[:10]
    
    if new_reg_date and new_reg_date != old_reg_date:
        try:
            reg_date = datetime.fromisoformat(update_data["registration_date"].replace("Z", "+00:00"))
        except (ValueError, TypeError):
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
        raise NotFoundError("Product", product_id)
    logger.info(f"Deleted product {product_id}")
    return {"message": "Product deleted successfully"}
