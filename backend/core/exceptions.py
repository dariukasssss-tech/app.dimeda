"""
Centralized Exception Classes for Dimeda Service Pro API

All custom exceptions extend AppException for consistent error handling.
"""
from typing import Any, Dict, Optional


class AppException(Exception):
    """Base exception class for all application errors"""
    
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to response dictionary"""
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }


# Authentication & Authorization Errors (401, 403)
class AuthenticationError(AppException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication required", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details
        )


class AuthorizationError(AppException):
    """Raised when user lacks permission"""
    
    def __init__(self, message: str = "Access denied", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=403,
            details=details
        )


class InvalidTokenError(AuthenticationError):
    """Raised when auth token is invalid or expired"""
    
    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(message=message, details={"reason": "token_invalid"})


# Resource Errors (404, 409)
class NotFoundError(AppException):
    """Raised when a resource is not found"""
    
    def __init__(
        self,
        resource: str,
        identifier: Optional[str] = None,
        message: Optional[str] = None
    ):
        msg = message or f"{resource} not found"
        details = {"resource": resource}
        if identifier:
            details["identifier"] = identifier
        super().__init__(
            message=msg,
            code="NOT_FOUND",
            status_code=404,
            details=details
        )


class ResourceExistsError(AppException):
    """Raised when trying to create a resource that already exists"""
    
    def __init__(
        self,
        resource: str,
        field: str,
        value: str,
        message: Optional[str] = None
    ):
        msg = message or f"{resource} with {field} '{value}' already exists"
        super().__init__(
            message=msg,
            code="RESOURCE_EXISTS",
            status_code=409,
            details={"resource": resource, "field": field, "value": value}
        )


# Validation Errors (400)
class ValidationError(AppException):
    """Raised when request data fails validation"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        details: Optional[Dict] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details=error_details
        )


class InvalidFieldError(ValidationError):
    """Raised when a field has an invalid value"""
    
    def __init__(self, field: str, value: Any, allowed_values: Optional[list] = None):
        details = {"provided_value": str(value)}
        if allowed_values:
            details["allowed_values"] = allowed_values
        super().__init__(
            message=f"Invalid value for '{field}'",
            field=field,
            details=details
        )


# Business Logic Errors (400, 422)
class BusinessLogicError(AppException):
    """Raised when business rules are violated"""
    
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="BUSINESS_LOGIC_ERROR",
            status_code=422,
            details=details
        )


class InvalidStateTransitionError(BusinessLogicError):
    """Raised when an invalid state transition is attempted"""
    
    def __init__(self, current_state: str, target_state: str, resource: str = "resource"):
        super().__init__(
            message=f"Cannot transition {resource} from '{current_state}' to '{target_state}'",
            details={
                "current_state": current_state,
                "target_state": target_state,
                "resource": resource
            }
        )


# Database Errors (500)
class DatabaseError(AppException):
    """Raised when database operations fail"""
    
    def __init__(self, message: str = "Database operation failed", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=500,
            details=details
        )


# External Service Errors (502, 503)
class ExternalServiceError(AppException):
    """Raised when external service calls fail"""
    
    def __init__(self, service: str, message: Optional[str] = None, details: Optional[Dict] = None):
        msg = message or f"External service '{service}' unavailable"
        error_details = details or {}
        error_details["service"] = service
        super().__init__(
            message=msg,
            code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details=error_details
        )
