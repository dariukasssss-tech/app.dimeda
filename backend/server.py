"""
Dimeda Service Pro API - Main Application Entry Point
Refactored modular structure:
- models/: Pydantic models
- routes/: API route handlers
- core/: Configuration, database, authentication, logging, error handling
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import sys
from pathlib import Path

# Add backend directory to path for module imports
sys.path.insert(0, str(Path(__file__).parent))

from core.config import FRONTEND_URL
from core.database import shutdown_db
from core.auth import AuthMiddleware
from core.logging_config import get_logger, setup_logging
from core.error_handlers import register_exception_handlers
from core.middleware import RequestLoggingMiddleware
from routes import (
    auth_router,
    products_router,
    services_router,
    issues_router,
    maintenance_router,
    export_router,
    stats_router,
    technician_router,
    translations_router,
    customers_router
)

# Initialize logging (JSON format for production)
import os
_env = os.environ.get("ENVIRONMENT", "development")
setup_logging(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    json_format=(_env == "production")
)

logger = get_logger(__name__)

# Create the main app
app = FastAPI(
    title="Dimeda Service Pro API",
    description="Service management system for Medirol Vivera Monobloc stretchers",
    version="1.0.0"
)

# Register global exception handlers (must be done before adding routes)
register_exception_handlers(app)

# Include all routers with /api prefix
app.include_router(stats_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(services_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(technician_router, prefix="/api")
app.include_router(translations_router, prefix="/api")
app.include_router(customers_router, prefix="/api")

# Add Request Logging Middleware (must be added before other middleware)
app.add_middleware(RequestLoggingMiddleware)

# Add Auth Middleware
app.add_middleware(AuthMiddleware)

# CORS configuration
cors_origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "https://stretcher-pro-1.preview.emergentagent.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up", extra={"environment": _env})

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Application shutting down")
    await shutdown_db()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "dimeda-api"}
