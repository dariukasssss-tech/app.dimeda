import secrets
import hashlib
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from .config import AUTH_COOKIE_NAME, AUTH_HEADER_NAME

def generate_auth_token():
    """Generate a secure auth token"""
    return secrets.token_urlsafe(32)

def hash_password(password: str) -> str:
    """Hash password for comparison"""
    return hashlib.sha256(password.encode()).hexdigest()

# Store valid tokens (in production, use Redis or database)
valid_tokens = set()  # Admin tokens
valid_technician_tokens = set()  # Technician tokens
valid_customer_tokens = set()

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip auth for login endpoints, CORS preflight, and translations
        if request.url.path in ["/api/auth/login", "/api/auth/customer-login", "/api/auth/technician-login", "/api/auth/check", "/api/auth/logout"]:
            return await call_next(request)
        
        # Skip auth for translations endpoints (public)
        if request.url.path.startswith("/api/translations"):
            return await call_next(request)
        
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Check if it's an API route that needs protection
        if request.url.path.startswith("/api"):
            # Check both cookie and header for token
            auth_token = request.cookies.get(AUTH_COOKIE_NAME)
            if not auth_token:
                auth_token = request.headers.get(AUTH_HEADER_NAME)
            
            # Accept admin, technician, and customer tokens
            if not auth_token or (auth_token not in valid_tokens and auth_token not in valid_technician_tokens and auth_token not in valid_customer_tokens):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized. Please login."}
                )
        
        return await call_next(request)
