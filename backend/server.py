from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import io
import csv
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Dimeda Service Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

# Valid cities for product location
VALID_CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"]

# Product Models
class ProductBase(BaseModel):
    serial_number: str
    model_name: str = "Vivera Monobloc"
    city: str  # One of the 5 cities
    location_detail: Optional[str] = None  # Hospital name, ward, etc.
    notes: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    registration_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "active"

# Service Record Models
class ServiceRecordBase(BaseModel):
    product_id: str
    technician_name: str
    service_type: str  # maintenance, repair, inspection
    description: str
    issues_found: Optional[str] = None

class ServiceRecordCreate(ServiceRecordBase):
    service_date: Optional[str] = None

class ServiceRecord(ServiceRecordBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Issue Models
class IssueBase(BaseModel):
    product_id: str
    issue_type: str  # mechanical, electrical, cosmetic, other
    severity: str  # low, medium, high, critical
    title: str
    description: str

class IssueCreate(IssueBase):
    photos: Optional[List[str]] = []  # base64 encoded images

class Issue(IssueBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"  # open, in_progress, resolved
    photos: List[str] = []
    resolution: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    resolution: Optional[str] = None

# Scheduled Maintenance Models
class ScheduledMaintenanceBase(BaseModel):
    product_id: str
    scheduled_date: str  # ISO date string
    maintenance_type: str  # routine, inspection, calibration
    technician_name: Optional[str] = None
    notes: Optional[str] = None

class ScheduledMaintenanceCreate(ScheduledMaintenanceBase):
    pass

class ScheduledMaintenance(ScheduledMaintenanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "scheduled"  # scheduled, completed, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class ScheduledMaintenanceUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    maintenance_type: Optional[str] = None
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# ============ PRODUCT ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Dimeda Service Pro API", "version": "1.0.0"}

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    # Validate city
    if product.city not in VALID_CITIES:
        raise HTTPException(status_code=400, detail=f"Invalid city. Must be one of: {', '.join(VALID_CITIES)}")
    
    # Check if serial number already exists
    existing = await db.products.find_one({"serial_number": product.serial_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this serial number already exists")
    
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    await db.products.insert_one(doc)
    
    # Auto-schedule annual maintenance for 5 years (2026-2030)
    for year in range(2026, 2031):
        # Schedule maintenance on the registration anniversary or Jan 15 of each year
        scheduled_date = f"{year}-01-15"
        maintenance_obj = ScheduledMaintenance(
            product_id=product_obj.id,
            scheduled_date=scheduled_date,
            maintenance_type="routine",
            technician_name=None,
            notes=f"Annual maintenance - {product.city}"
        )
        await db.scheduled_maintenance.insert_one(maintenance_obj.model_dump())
    
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/products/serial/{serial_number}", response_model=Product)
async def get_product_by_serial(serial_number: str):
    product = await db.products.find_one({"serial_number": serial_number}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductCreate):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate city
    if product.city not in VALID_CITIES:
        raise HTTPException(status_code=400, detail=f"Invalid city. Must be one of: {', '.join(VALID_CITIES)}")
    
    update_data = product.model_dump()
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# ============ SERVICE RECORD ENDPOINTS ============

@api_router.post("/services", response_model=ServiceRecord)
async def create_service_record(service: ServiceRecordCreate):
    # Verify product exists
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

@api_router.get("/services", response_model=List[ServiceRecord])
async def get_services(product_id: Optional[str] = None):
    query = {"product_id": product_id} if product_id else {}
    services = await db.services.find(query, {"_id": 0}).sort("service_date", -1).to_list(1000)
    return services

@api_router.get("/services/{service_id}", response_model=ServiceRecord)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service record not found")
    return service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service record not found")
    return {"message": "Service record deleted successfully"}

# ============ ISSUE ENDPOINTS ============

@api_router.post("/issues", response_model=Issue)
async def create_issue(issue: IssueCreate):
    # Verify product exists
    product = await db.products.find_one({"id": issue.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    issue_obj = Issue(**issue.model_dump())
    doc = issue_obj.model_dump()
    await db.issues.insert_one(doc)
    return issue_obj

@api_router.get("/issues", response_model=List[Issue])
async def get_issues(product_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    issues = await db.issues.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return issues

@api_router.get("/issues/{issue_id}", response_model=Issue)
async def get_issue(issue_id: str):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@api_router.put("/issues/{issue_id}", response_model=Issue)
async def update_issue(issue_id: str, update: IssueUpdate):
    existing = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data.get("status") == "resolved":
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.issues.update_one({"id": issue_id}, {"$set": update_data})
    updated = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    return updated

@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str):
    result = await db.issues.delete_one({"id": issue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted successfully"}

# ============ STATISTICS ENDPOINT ============

@api_router.get("/stats")
async def get_stats():
    total_products = await db.products.count_documents({})
    total_services = await db.services.count_documents({})
    open_issues = await db.issues.count_documents({"status": "open"})
    resolved_issues = await db.issues.count_documents({"status": "resolved"})
    
    # Recent services (last 7 days)
    seven_days_ago = datetime.now(timezone.utc).isoformat()[:10]
    recent_services = await db.services.count_documents({})
    
    return {
        "total_products": total_products,
        "total_services": total_services,
        "open_issues": open_issues,
        "resolved_issues": resolved_issues,
        "recent_services": recent_services
    }

# ============ EXPORT ENDPOINT ============

@api_router.get("/export/csv")
async def export_csv(data_type: str = "services"):
    if data_type == "services":
        records = await db.services.find({}, {"_id": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No service records found")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "product_id", "technician_name", "service_type", "description", "issues_found", "service_date", "created_at"])
        writer.writeheader()
        for record in records:
            writer.writerow(record)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=service_records_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    elif data_type == "products":
        records = await db.products.find({}, {"_id": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No products found")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "serial_number", "model_name", "location", "notes", "registration_date", "status"])
        writer.writeheader()
        for record in records:
            writer.writerow(record)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=products_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    elif data_type == "issues":
        records = await db.issues.find({}, {"_id": 0, "photos": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No issues found")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "product_id", "issue_type", "severity", "title", "description", "status", "resolution", "created_at", "resolved_at"])
        writer.writeheader()
        for record in records:
            record.pop("photos", None)
            writer.writerow(record)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=issues_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    raise HTTPException(status_code=400, detail="Invalid data type. Use: services, products, or issues")

# ============ SCHEDULED MAINTENANCE ENDPOINTS ============

@api_router.post("/scheduled-maintenance", response_model=ScheduledMaintenance)
async def create_scheduled_maintenance(maintenance: ScheduledMaintenanceCreate):
    # Verify product exists
    product = await db.products.find_one({"id": maintenance.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    maintenance_obj = ScheduledMaintenance(**maintenance.model_dump())
    doc = maintenance_obj.model_dump()
    await db.scheduled_maintenance.insert_one(doc)
    return maintenance_obj

@api_router.get("/scheduled-maintenance", response_model=List[ScheduledMaintenance])
async def get_scheduled_maintenance(
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    query = {}
    if product_id:
        query["product_id"] = product_id
    if status:
        query["status"] = status
    
    # Filter by month/year if provided
    if month and year:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        query["scheduled_date"] = {"$gte": start_date, "$lt": end_date}
    elif year:
        query["scheduled_date"] = {"$gte": f"{year}-01-01", "$lt": f"{year + 1}-01-01"}
    
    maintenance = await db.scheduled_maintenance.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)
    return maintenance

@api_router.get("/scheduled-maintenance/{maintenance_id}", response_model=ScheduledMaintenance)
async def get_scheduled_maintenance_by_id(maintenance_id: str):
    maintenance = await db.scheduled_maintenance.find_one({"id": maintenance_id}, {"_id": 0})
    if not maintenance:
        raise HTTPException(status_code=404, detail="Scheduled maintenance not found")
    return maintenance

@api_router.put("/scheduled-maintenance/{maintenance_id}", response_model=ScheduledMaintenance)
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

@api_router.delete("/scheduled-maintenance/{maintenance_id}")
async def delete_scheduled_maintenance(maintenance_id: str):
    result = await db.scheduled_maintenance.delete_one({"id": maintenance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled maintenance not found")
    return {"message": "Scheduled maintenance deleted successfully"}

@api_router.get("/scheduled-maintenance/upcoming/count")
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
