from fastapi import APIRouter
from core.database import db
from core.config import VALID_CITIES

router = APIRouter(tags=["stats"])

@router.get("/")
async def root():
    return {"message": "Dimeda Service Pro API", "version": "1.0.0"}

@router.get("/cities")
async def get_cities():
    return {"cities": VALID_CITIES}

@router.get("/stats")
async def get_stats():
    total_products = await db.products.count_documents({})
    total_services = await db.services.count_documents({})
    open_issues = await db.issues.count_documents({"status": "open"})
    resolved_issues = await db.issues.count_documents({"status": "resolved"})
    recent_services = await db.services.count_documents({})
    
    return {
        "total_products": total_products,
        "total_services": total_services,
        "open_issues": open_issues,
        "resolved_issues": resolved_issues,
        "recent_services": recent_services
    }
