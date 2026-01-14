from fastapi import APIRouter, Request, Response, HTTPException
from models.auth import LoginRequest
from core.config import (
    AUTH_COOKIE_NAME, AUTH_TOKEN_EXPIRY_DAYS,
    ADMIN_PASSWORD, TECHNICIAN_PASSWORD, CUSTOMER_ACCESS_PASSWORD, APP_ACCESS_PASSWORD
)
from core.auth import (
    generate_auth_token, valid_tokens, valid_technician_tokens, valid_customer_tokens
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
async def login(request: LoginRequest, response: Response):
    # Check for admin password
    if request.password == ADMIN_PASSWORD:
        token = generate_auth_token()
        valid_tokens.add(token)
        
        response.set_cookie(
            key=AUTH_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
            path="/"
        )
        
        return {"message": "Admin login successful", "token": token, "type": "admin"}
    
    # For backward compatibility, also accept old password
    if request.password == APP_ACCESS_PASSWORD:
        token = generate_auth_token()
        valid_tokens.add(token)
        
        response.set_cookie(
            key=AUTH_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
            path="/"
        )
        
        return {"message": "Admin login successful", "token": token, "type": "admin"}
    
    raise HTTPException(status_code=401, detail="Invalid password")

@router.post("/technician-login")
async def technician_login(request: LoginRequest, response: Response):
    if request.password != TECHNICIAN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid technician password")
    
    token = generate_auth_token()
    valid_technician_tokens.add(token)
    
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"message": "Technician login successful", "token": token, "type": "technician"}

@router.post("/customer-login")
async def customer_login(request: LoginRequest, response: Response):
    if request.password != CUSTOMER_ACCESS_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid customer password")
    
    token = generate_auth_token()
    valid_customer_tokens.add(token)
    
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=AUTH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"message": "Customer login successful", "token": token, "type": "customer"}

@router.get("/check")
async def check_auth(request: Request):
    from core.config import AUTH_HEADER_NAME
    auth_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not auth_token:
        auth_token = request.headers.get(AUTH_HEADER_NAME)
    
    if auth_token:
        if auth_token in valid_tokens:
            return {"authenticated": True, "type": "admin"}
        elif auth_token in valid_technician_tokens:
            return {"authenticated": True, "type": "technician"}
        elif auth_token in valid_customer_tokens:
            return {"authenticated": True, "type": "customer"}
    return {"authenticated": False, "type": None}

@router.post("/logout")
async def logout(request: Request, response: Response):
    from core.config import AUTH_HEADER_NAME
    auth_token = request.cookies.get(AUTH_COOKIE_NAME)
    if not auth_token:
        auth_token = request.headers.get(AUTH_HEADER_NAME)
    
    if auth_token:
        if auth_token in valid_tokens:
            valid_tokens.discard(auth_token)
        if auth_token in valid_technician_tokens:
            valid_technician_tokens.discard(auth_token)
        if auth_token in valid_customer_tokens:
            valid_customer_tokens.discard(auth_token)
    
    response.delete_cookie(key=AUTH_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}
