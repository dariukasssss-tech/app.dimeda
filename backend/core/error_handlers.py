"""
Global Exception Handlers for FastAPI

Provides centralized error handling with consistent response formats.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback

from .exceptions import AppException
from .logging_config import get_logger

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers with the FastAPI app"""
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        """Handle custom application exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.warning(
            "Application error",
            extra={
                "request_id": request_id,
                "error_code": exc.code,
                "error_message": exc.message,
                "status_code": exc.status_code,
                "path": str(request.url.path),
                "method": request.method,
                "details": exc.details
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict()
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle standard HTTP exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.warning(
            "HTTP error",
            extra={
                "request_id": request_id,
                "status_code": exc.status_code,
                "detail": str(exc.detail),
                "path": str(request.url.path),
                "method": request.method
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": _get_error_code(exc.status_code),
                    "message": str(exc.detail),
                    "details": {}
                }
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle Pydantic validation errors"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Extract validation errors
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        logger.warning(
            "Validation error",
            extra={
                "request_id": request_id,
                "path": str(request.url.path),
                "method": request.method,
                "validation_errors": errors
            }
        )
        
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": {"errors": errors}
                }
            }
        )
    
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all unhandled exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log full traceback for debugging
        logger.error(
            "Unhandled exception",
            extra={
                "request_id": request_id,
                "path": str(request.url.path),
                "method": request.method,
                "exception_type": type(exc).__name__,
                "exception_message": str(exc),
                "traceback": traceback.format_exc()
            }
        )
        
        # Return generic error to client (don't expose internal details)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    "details": {"request_id": request_id}
                }
            }
        )


def _get_error_code(status_code: int) -> str:
    """Map HTTP status codes to error codes"""
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE"
    }
    return code_map.get(status_code, "UNKNOWN_ERROR")
