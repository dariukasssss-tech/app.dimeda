"""
Dimeda Service Pro API - Main Application Entry Point
Refactored modular structure:
- models/: Pydantic models
- routes/: API route handlers
- core/: Configuration, database, authentication
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging
import sys
from pathlib import Path

# Add backend directory to path for module imports
sys.path.insert(0, str(Path(__file__).parent))

from core.config import FRONTEND_URL
from core.database import shutdown_db
from core.auth import AuthMiddleware
from routes import (
    auth_router,
    products_router,
    services_router,
    issues_router,
    maintenance_router,
    export_router,
    stats_router,
    technician_router
)

# Create the main app
app = FastAPI(title="Dimeda Service Pro API")

# Include all routers with /api prefix
app.include_router(stats_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(services_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(technician_router, prefix="/api")

# Add Auth Middleware (before CORS)
app.add_middleware(AuthMiddleware)

# CORS configuration
cors_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "https://techflow-14.preview.emergentagent.com"
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
    await shutdown_db()
