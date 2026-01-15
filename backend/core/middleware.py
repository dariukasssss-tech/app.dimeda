"""
Request/Response Logging Middleware

Logs all HTTP requests with:
- Unique request ID for correlation
- Request details (method, path, headers)
- Response status and duration
- User context when authenticated
"""
import time
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from .logging_config import get_logger, set_request_context, clear_request_context

logger = get_logger("http")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs all HTTP requests and responses.
    
    Features:
    - Assigns unique request_id for tracing
    - Logs request start and completion
    - Measures request duration
    - Captures response status
    """
    
    # Paths to skip logging (health checks, static files)
    SKIP_PATHS = {"/health", "/healthz", "/ready", "/metrics"}
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip logging for certain paths
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store in request state for access in handlers
        request.state.request_id = request_id
        
        # Set request context for logging
        set_request_context(
            request_id=request_id,
            path=str(request.url.path),
            method=request.method
        )
        
        # Record start time
        start_time = time.perf_counter()
        
        # Log request start
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "query": str(request.query_params) if request.query_params else None,
                "client_ip": self._get_client_ip(request),
                "user_agent": request.headers.get("user-agent", "")[:100]
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            # Log request completion
            log_level = "info" if response.status_code < 400 else "warning"
            getattr(logger, log_level)(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "status_code": response.status_code,
                    "duration_ms": duration_ms
                }
            )
            
            # Add request ID to response headers for client-side correlation
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as exc:
            # Calculate duration even for errors
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            logger.error(
                "Request failed with exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": str(request.url.path),
                    "duration_ms": duration_ms,
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc)
                }
            )
            raise
            
        finally:
            # Clear request context
            clear_request_context()
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies"""
        # Check X-Forwarded-For header (set by reverse proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        if request.client:
            return request.client.host
        
        return "unknown"
