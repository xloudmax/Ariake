"""Middleware for logging and error handling."""

import time
import traceback
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from .config import logger
from .exceptions import AIServiceError


async def log_requests_middleware(request: Request, call_next: Callable) -> Response:
    """Log all incoming requests with timing."""
    start_time = time.time()
    
    # Log request
    logger.info(
        "Request started",
        extra={
            "method": request.method,
            "path": request.url.path,
            "client": request.client.host if request.client else "unknown",
        },
    )
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            },
        )
        
        return response
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(
            "Request failed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "duration_ms": round(duration * 1000, 2),
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
        raise


async def error_handler_middleware(request: Request, call_next: Callable) -> Response:
    """Handle exceptions and return proper error responses."""
    try:
        return await call_next(request)
    except AIServiceError as exc:
        logger.warning(
            "AI Service error",
            extra={
                "path": request.url.path,
                "error": exc.message,
                "status_code": exc.status_code,
            },
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "type": exc.__class__.__name__},
        )
    except Exception as exc:
        logger.error(
            "Unhandled exception",
            extra={
                "path": request.url.path,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "type": "UnhandledError"},
        )
