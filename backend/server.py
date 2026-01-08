from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Dimeda Service Pro API")

# Auth configuration
APP_ACCESS_PASSWORD = os.environ.get('APP_ACCESS_PASSWORD', '')
CUSTOMER_ACCESS_PASSWORD = os.environ.get('CUSTOMER_ACCESS_PASSWORD', 'customer2025')  # Default customer password
AUTH_COOKIE_NAME = "dimeda_auth"
AUTH_HEADER_NAME = "X-Auth-Token"
AUTH_TOKEN_EXPIRY_DAYS = 7

def generate_auth_token():
    """Generate a secure auth token"""
    return secrets.token_urlsafe(32)

def hash_password(password: str) -> str:
    """Hash password for comparison"""
    return hashlib.sha256(password.encode()).hexdigest()

# Store valid tokens (in production, use Redis or database)
valid_tokens = set()
valid_customer_tokens = set()

# Auth Middleware
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for login endpoints and CORS preflight
        if request.url.path in ["/api/auth/login", "/api/auth/customer-login", "/api/auth/check", "/api/auth/logout"]:
            return await call_next(request)
        
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check if it's an API route that needs protection
        if request.url.path.startswith("/api"):
            # Check both cookie and header for token
            auth_token = request.cookies.get(AUTH_COOKIE_NAME)
            if not auth_token:
                auth_token = request.headers.get(AUTH_HEADER_NAME)
            
            # Accept both service and customer tokens
            if not auth_token or (auth_token not in valid_tokens and auth_token not in valid_customer_tokens):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized. Please login."}
                )
        
        return await call_next(request)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

# Valid cities for product location
VALID_CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"]

# Product Models
# Valid model options
VALID_MODELS = ["Powered Stretchers", "Roll-in stretchers"]

class ProductBase(BaseModel):
    serial_number: str
    model_name: str  # One of VALID_MODELS
    city: str  # One of the 5 cities
    location_detail: Optional[str] = None  # Hospital name, ward, etc.
    notes: Optional[str] = None
    registration_date: Optional[str] = None  # Custom registration date

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
    warranty_status: Optional[str] = None  # warranty, non_warranty

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
    technician_name: Optional[str] = None  # Assigned technician
    warranty_status: Optional[str] = None  # warranty, non_warranty

class IssueCreate(IssueBase):
    photos: Optional[List[str]] = []  # base64 encoded images

class Issue(IssueBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "open"  # open, in_progress, resolved
    photos: List[str] = []
    resolution: Optional[str] = None
    technician_name: Optional[str] = None
    technician_assigned_at: Optional[str] = None  # When technician was assigned
    warranty_status: Optional[str] = None
    product_location: Optional[str] = None  # Address/location info from customer
    source: Optional[str] = None  # "customer" for customer-reported issues
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None

# Customer Issue Create model (simpler than regular issue)
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

# Scheduled Maintenance Models
class ScheduledMaintenanceBase(BaseModel):
    product_id: str
    scheduled_date: str  # ISO date string
    maintenance_type: str  # routine, inspection, calibration, issue_inspection, issue_service, issue_replacement
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    source: str = "manual"  # manual, auto_yearly, issue
    issue_id: Optional[str] = None  # Link to issue if from issue
    priority: Optional[str] = None  # 12h, 24h for issue-based tasks

class ScheduledMaintenanceCreate(ScheduledMaintenanceBase):
    pass

class ScheduledMaintenance(ScheduledMaintenanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "scheduled"  # scheduled, in_progress, completed, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class ScheduledMaintenanceUpdate(BaseModel):
    scheduled_date: Optional[str] = None
    maintenance_type: Optional[str] = None
    technician_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None

# ============ PRODUCT ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Dimeda Service Pro API", "version": "1.0.0"}

# ============ AUTH ENDPOINTS ============

class LoginRequest(BaseModel):
    password: str

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    if not APP_ACCESS_PASSWORD:
        raise HTTPException(status_code=500, detail="Server password not configured")
    
    if request.password != APP_ACCESS_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Generate token and store it
    token = generate_auth_token()
    valid_tokens.add(token)
    
    # Set HTTP-only cookie (for same-origin requests)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    # Also return token in response for cross-origin scenarios
    return {"message": "Login successful", "token": token, "type": "service"}

@api_router.post("/auth/customer-login")
async def customer_login(request: LoginRequest, response: Response):
    if request.password != CUSTOMER_ACCESS_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid customer password")
    
    # Generate token and store it in customer tokens
    token = generate_auth_token()
    valid_customer_tokens.add(token)
    
    # Set HTTP-only cookie (for same-origin requests)
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    # Also return token in response for cross-origin scenarios
    return {"message": "Customer login successful", "token": token, "type": "customer"}

@api_router.get("/auth/check")
async def check_auth(request: Request):
    auth_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not auth_token:
        auth_token = request.headers.get(AUTH_HEADER_NAME)
    
    if auth_token:
        if auth_token in valid_tokens:
            return {"authenticated": True, "type": "service"}
        elif auth_token in valid_customer_tokens:
            return {"authenticated": True, "type": "customer"}
    return {"authenticated": False, "type": None}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    auth_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not auth_token:
        auth_token = request.headers.get(AUTH_HEADER_NAME)
    
    if auth_token and auth_token in valid_tokens:
        valid_tokens.discard(auth_token)
    
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/cities")
async def get_cities():
    return {"cities": VALID_CITIES}

@api_router.post("/products", response_model=Product)
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
        # Parse the provided date
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
    
    # Auto-schedule yearly maintenance for 5 years (12 months after registration, then yearly)
    for year_offset in range(1, 6):  # 1 to 5 years
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
    
    # Check if registration date changed
    old_reg_date = existing.get("registration_date", "")[:10]
    new_reg_date = (update_data.get("registration_date") or "")[:10]
    
    # If registration date is provided and different, recalculate yearly maintenance
    if new_reg_date and new_reg_date != old_reg_date:
        # Parse the new date
        try:
            reg_date = datetime.fromisoformat(update_data["registration_date"].replace("Z", "+00:00"))
        except:
            reg_date = datetime.strptime(update_data["registration_date"][:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        
        # Delete existing auto_yearly maintenance for this product
        await db.scheduled_maintenance.delete_many({
            "product_id": product_id,
            "source": "auto_yearly"
        })
        
        # Recreate yearly maintenance based on new date
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
    
    # Auto-schedule maintenance based on issue type
    now = datetime.now(timezone.utc)
    
    if issue.issue_type == "electrical":
        # Electrical: replacement of spare unit in 12 hours
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
        # Mechanical/Cosmetic/Other: inspection in 12 hours, service in 24 hours
        # Inspection in 12 hours
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
        
        # Service in 24 hours
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
    
    # When marking as "open", clear the technician assignment to allow reassignment
    if update_data.get("status") == "open" and existing.get("technician_name"):
        update_data["technician_name"] = None
        update_data["technician_assigned_at"] = None
        # Also delete the associated calendar entry for customer issues
        if existing.get("source") == "customer":
            await db.scheduled_maintenance.delete_many({
                "issue_id": issue_id,
                "source": "customer_issue"
            })
    
    # Track when technician was assigned
    if update_data.get("technician_name") and not existing.get("technician_name"):
        update_data["technician_assigned_at"] = datetime.now(timezone.utc).isoformat()
        
        # If this is a customer-reported issue, create a calendar entry with SLA deadline
        if existing.get("source") == "customer":
            # Calculate SLA deadline: issue created_at + 12 hours
            created_at = datetime.fromisoformat(existing["created_at"].replace("Z", "+00:00"))
            sla_deadline = created_at + timedelta(hours=12)
            
            # Create scheduled maintenance entry for this customer issue
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

# Customer Issue Endpoint - creates high severity issues
@api_router.post("/issues/customer", response_model=Issue)
async def create_customer_issue(issue: CustomerIssueCreate):
    # Verify product exists
    product = await db.products.find_one({"id": issue.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create issue with high severity and customer source
    issue_data = issue.model_dump()
    issue_data["severity"] = "high"  # Customer issues are always high severity
    issue_data["source"] = "customer"  # Mark as customer-reported
    issue_data["photos"] = []
    
    issue_obj = Issue(**issue_data)
    doc = issue_obj.model_dump()
    await db.issues.insert_one(doc)
    return issue_obj

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
        writer = csv.DictWriter(output, fieldnames=["id", "serial_number", "model_name", "city", "location_detail", "notes", "registration_date", "status"])
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
        # Get all issues
        records = await db.issues.find({}, {"_id": 0, "photos": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No issues found")
        
        # Get all products to map product_id to serial_number and city
        products = await db.products.find({}, {"_id": 0}).to_list(10000)
        product_map = {p["id"]: p for p in products}
        
        output = io.StringIO()
        fieldnames = ["issue_type", "date", "resolved_date", "serial_number", "city", "technician_name", "warranty_status"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            product = product_map.get(record.get("product_id"), {})
            
            # Format resolved date
            resolved_date = record.get("resolved_at")
            if resolved_date:
                try:
                    resolved_date = datetime.fromisoformat(resolved_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
                except:
                    resolved_date = resolved_date
            else:
                resolved_date = "N/A"
            
            # Format created date
            created_date = record.get("created_at", "")
            if created_date:
                try:
                    created_date = datetime.fromisoformat(created_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
                except:
                    pass
            
            # Format warranty status
            warranty = record.get("warranty_status", "")
            if warranty == "warranty":
                warranty = "Warranty"
            elif warranty == "non_warranty":
                warranty = "Non Warranty"
            else:
                warranty = "N/A"
            
            writer.writerow({
                "issue_type": record.get("issue_type", ""),
                "date": created_date,
                "resolved_date": resolved_date,
                "serial_number": product.get("serial_number", "Unknown"),
                "city": product.get("city", "Unknown"),
                "technician_name": record.get("technician_name", "N/A"),
                "warranty_status": warranty,
            })
        
        output.seek(0)
        # Filename: Issue Report (actual date)
        today = datetime.now().strftime("%Y-%m-%d")
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="Issue Report ({today}).csv"'}
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

# Add Auth Middleware (before CORS)
app.add_middleware(AuthMiddleware)

# Get frontend URL from environment for CORS
frontend_url = os.environ.get('FRONTEND_URL', 'https://service-bridge-22.preview.emergentagent.com')
cors_origins = [
    frontend_url,
    "http://localhost:3000",
    "https://service-bridge-22.preview.emergentagent.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
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
