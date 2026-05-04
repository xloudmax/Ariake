from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .api import lifespan, router
from .config import AI_SERVICE_API_KEY, logger
from .exceptions import AIServiceError
from .middleware import error_handler_middleware, log_requests_middleware


def create_app() -> FastAPI:
    app = FastAPI(
        title="C404 Insight AI Service - 2025 Edition",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    public_paths = {"/health", "/db-health", "/docs", "/redoc", "/openapi.json"}

    # Add logging middleware
    @app.middleware("http")
    async def logging_middleware(request: Request, call_next):
        return await log_requests_middleware(request, call_next)

    # Add error handling middleware
    @app.middleware("http")
    async def error_middleware(request: Request, call_next):
        return await error_handler_middleware(request, call_next)

    # API key authentication
    @app.middleware("http")
    async def api_key_middleware(request: Request, call_next):
        if AI_SERVICE_API_KEY and request.url.path not in public_paths:
            key = request.headers.get("X-API-Key")
            if key != AI_SERVICE_API_KEY:
                logger.warning(
                    "Unauthorized access attempt",
                    extra={"path": request.url.path, "client": request.client.host if request.client else "unknown"},
                )
                return JSONResponse(
                    status_code=401,
                    content={
                        "detail": "Invalid or missing API key. Provide X-API-Key header."
                    },
                )
        return await call_next(request)

    # Global exception handler for AIServiceError
    @app.exception_handler(AIServiceError)
    async def ai_service_error_handler(request: Request, exc: AIServiceError):
        logger.error(
            "AI Service error",
            extra={"path": request.url.path, "error": exc.message, "status_code": exc.status_code},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "type": exc.__class__.__name__},
        )

    app.include_router(router)
    logger.info("AI Service application created successfully")
    return app


app = create_app()
