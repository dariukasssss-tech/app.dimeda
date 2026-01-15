"""
Centralized Structured Logging Configuration for Production

Features:
- JSON-formatted logs for production (machine-readable)
- Human-readable format for development
- Request/response correlation via request_id
- Contextual information (user, endpoint, duration)
"""
import logging
import sys
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextvars import ContextVar
import uuid

# Context variable for request-scoped data
request_context: ContextVar[Dict[str, Any]] = ContextVar("request_context", default={})


def get_request_id() -> str:
    """Get current request ID from context"""
    ctx = request_context.get()
    return ctx.get("request_id", "no-request-id")


def set_request_context(request_id: str, **kwargs) -> None:
    """Set request context for the current request"""
    request_context.set({"request_id": request_id, **kwargs})


def clear_request_context() -> None:
    """Clear request context after request completes"""
    request_context.set({})


class JSONFormatter(logging.Formatter):
    """
    JSON formatter for structured logging in production.
    Outputs one JSON object per line for easy parsing.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add request context if available
        ctx = request_context.get()
        if ctx:
            log_data["request_id"] = ctx.get("request_id")
            if "user_id" in ctx:
                log_data["user_id"] = ctx["user_id"]
            if "user_type" in ctx:
                log_data["user_type"] = ctx["user_type"]
        
        # Add extra fields from the log record
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "error_code"):
            log_data["error_code"] = record.error_code
        if hasattr(record, "error_message"):
            log_data["error_message"] = record.error_message
        if hasattr(record, "details"):
            log_data["details"] = record.details
        if hasattr(record, "validation_errors"):
            log_data["validation_errors"] = record.validation_errors
        if hasattr(record, "exception_type"):
            log_data["exception_type"] = record.exception_type
        if hasattr(record, "exception_message"):
            log_data["exception_message"] = record.exception_message
        if hasattr(record, "traceback"):
            log_data["traceback"] = record.traceback
        
        # Add file location for errors
        if record.levelno >= logging.ERROR:
            log_data["file"] = record.filename
            log_data["line"] = record.lineno
            log_data["function"] = record.funcName
        
        return json.dumps(log_data, default=str)


class DevelopmentFormatter(logging.Formatter):
    """
    Human-readable formatter for development.
    Includes colors for different log levels.
    """
    
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"
    
    def format(self, record: logging.LogRecord) -> str:
        # Get color for level
        color = self.COLORS.get(record.levelname, "")
        
        # Format timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Get request ID if available
        ctx = request_context.get()
        request_id = ctx.get("request_id", "")[:8] if ctx else ""
        req_str = f"[{request_id}]" if request_id else ""
        
        # Base message
        base = f"{timestamp} {color}{record.levelname:8}{self.RESET} {req_str} {record.name}: {record.getMessage()}"
        
        # Add extra context for HTTP requests
        extras = []
        if hasattr(record, "method") and hasattr(record, "path"):
            extras.append(f"{record.method} {record.path}")
        if hasattr(record, "status_code"):
            extras.append(f"status={record.status_code}")
        if hasattr(record, "duration_ms"):
            extras.append(f"duration={record.duration_ms}ms")
        
        if extras:
            base += f" | {' '.join(extras)}"
        
        return base


def setup_logging(
    level: str = "INFO",
    json_format: bool = True,
    log_file: Optional[str] = None
) -> None:
    """
    Configure the logging system.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON format (True for production, False for dev)
        log_file: Optional file path to write logs
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Choose formatter based on environment
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = DevelopmentFormatter()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(JSONFormatter())  # Always JSON for file
        root_logger.addHandler(file_handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.
    
    Usage:
        logger = get_logger(__name__)
        logger.info("Message", extra={"key": "value"})
    """
    return logging.getLogger(name)


# Auto-configure based on environment
_env = os.environ.get("ENVIRONMENT", "development").lower()
_log_level = os.environ.get("LOG_LEVEL", "INFO")
_json_logs = _env == "production"

setup_logging(level=_log_level, json_format=_json_logs)
