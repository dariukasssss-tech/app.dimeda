from fastapi import APIRouter
from typing import List
from datetime import datetime, timezone
from bson import ObjectId
from core.database import db
from core.exceptions import NotFoundError, ResourceExistsError, ValidationError
from core.logging_config import get_logger
from models.customer import CustomerCreate, CustomerUpdate, CustomerResponse

logger = get_logger(__name__)

router = APIRouter(tags=["customers"])

def customer_helper(customer) -> dict:
    return {
        "id": str(customer["_id"]),
        "name": customer.get("name", ""),
        "city": customer.get("city", ""),
        "address": customer.get("address"),
        "contact_person": customer.get("contact_person"),
        "phone": customer.get("phone"),
        "email": customer.get("email"),
        "created_at": customer.get("created_at", datetime.now(timezone.utc)),
        "updated_at": customer.get("updated_at"),
    }

@router.get("/customers", response_model=List[CustomerResponse])
async def get_customers():
    """Get all customers"""
    customers = []
    async for customer in db.customers.find().sort("name", 1):
        customers.append(customer_helper(customer))
    return customers

@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """Get a specific customer by ID"""
    if not ObjectId.is_valid(customer_id):
        raise ValidationError("Invalid customer ID format", field="customer_id")
    
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise NotFoundError("Customer", customer_id)
    
    return customer_helper(customer)

@router.get("/customers/by-city/{city}", response_model=List[CustomerResponse])
async def get_customers_by_city(city: str):
    """Get all customers in a specific city"""
    customers = []
    async for customer in db.customers.find({"city": city}).sort("name", 1):
        customers.append(customer_helper(customer))
    return customers

@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate):
    """Create a new customer"""
    # Check if customer with same name and city already exists
    existing = await db.customers.find_one({
        "name": customer.name,
        "city": customer.city
    })
    if existing:
        raise ResourceExistsError(
            "Customer", 
            "name/city", 
            f"{customer.name} in {customer.city}"
        )
    
    logger.info(f"Creating customer {customer.name} in {customer.city}")
    
    customer_dict = customer.model_dump()
    customer_dict["created_at"] = datetime.now(timezone.utc)
    customer_dict["updated_at"] = None
    
    result = await db.customers.insert_one(customer_dict)
    
    created_customer = await db.customers.find_one({"_id": result.inserted_id})
    logger.info(f"Customer created with ID {result.inserted_id}")
    return customer_helper(created_customer)

@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerUpdate):
    """Update a customer"""
    if not ObjectId.is_valid(customer_id):
        raise ValidationError("Invalid customer ID format", field="customer_id")
    
    existing = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not existing:
        raise NotFoundError("Customer", customer_id)
    
    logger.info(f"Updating customer {customer_id}")
    
    update_data = {k: v for k, v in customer.model_dump().items() if v is not None}
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.customers.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": update_data}
        )
    
    updated_customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    return customer_helper(updated_customer)

@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer"""
    if not ObjectId.is_valid(customer_id):
        raise ValidationError("Invalid customer ID format", field="customer_id")
    
    existing = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not existing:
        raise NotFoundError("Customer", customer_id)
    
    await db.customers.delete_one({"_id": ObjectId(customer_id)})
    logger.info(f"Deleted customer {customer_id}")
    
    return {"message": "Customer deleted successfully"}
