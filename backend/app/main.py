"""
Module: main.py
Purpose: FastAPI application entry point aur initialization
Yeh module FastAPI application ko configure aur setup karta hai.
Middleware, routes, CORS, aur health checks yahan define hote hain.

Key Components:
- FastAPI app instance: Main application
- ClinicGateMiddleware: JWT token verification aur clinic isolation
- CORSMiddleware: Cross-Origin Resource Sharing configuration
- API Router: V1 API endpoints
- Posture Router: Posture analysis endpoints
- Health endpoint: Application health monitoring

Middleware Order (Bottom-up):
1. CORSMiddleware (added last, executed first)
2. ClinicGateMiddleware (added first, executed second)
3. Application logic (executed last)

Configuration Sources:
- settings: app/core/config.py se loaded
- CORS origins: Environment variables se
- API version: settings.API_V1_PREFIX
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.rbac import validate_role_templates
from app.middleware.clinic_gate import ClinicGateMiddleware
from app.api.v1.router import api_router
from app.api.v1.posture import router as posture_router
import logging

logger = logging.getLogger(__name__)

validate_role_templates()


# FastAPI Application Instance
# Title aur version OpenAPI documentation mein display hote hain
# Swagger UI: http://localhost:8000/docs
from app.exceptions import BaseAppException, app_exception_handler

app = FastAPI(
    title="AV Suite Backend Foundation",
    version="0.1.0",
    description="Rehabilitation exercises management backend platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Register central exception handler for custom application errors
app.add_exception_handler(BaseAppException, app_exception_handler)

import os

# NOTE: removed public StaticFiles mount for /static -- prescription PDFs
# contain patient PHI and must only be served via the authenticated
# download route (GET /api/v1/prescriptions/{id}/pdf/download)



import time
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """Measures endpoint execution duration and adds X-Process-Time header."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time_ms = (time.perf_counter() - start_time) * 1000
        response.headers["X-Process-Time"] = f"{process_time_ms:.2f}ms"
        logger.info(
            f"[TIMING] {request.method} {request.url.path} - "
            f"{response.status_code} - {process_time_ms:.2f}ms"
        )
        return response


# Timing Middleware (records execution duration)
app.add_middleware(RequestTimingMiddleware)
logger.info("RequestTimingMiddleware registered")

# Clinic Gate Middleware
# JWT token verification aur clinic isolation middleware
# add_middleware method se priority order define karte hain
# Middleware order bottom-up hai (last added = first executed)
# ClinicGateMiddleware protected routes par token check karta hai
app.add_middleware(ClinicGateMiddleware)
logger.info("ClinicGateMiddleware registered")


# CORS Middleware Configuration
# Cross-Origin Resource Sharing security headers setup
# Frontend applications different domain se API access kar sakte hain
#
# CORS Configuration Details:
# - allow_origins: Allowed frontend origins (comma-separated list from .env)
#   Example: ["http://localhost:3000", "https://example.com"]
#   Security: Only trusted origins include karo
#
# - allow_credentials: Cookies/credentials send karte hain cross-origin requests mein
#   True: Set-Cookie header allow hota hai (session management ke liye)
#   False: Credentials nahi send hote
#
# - allow_methods: Allowed HTTP methods (GET, POST, PUT, DELETE, etc.)
#   ["*"] = All methods allowed
#   Specific: ["GET", "POST", "PUT", "DELETE"]
#
# - allow_headers: Allowed request headers (Authorization, Content-Type, etc.)
#   ["*"] = All headers allowed
#   Specific: ["Authorization", "Content-Type"]
#
# Middleware order: Last added = first executed
# CORSMiddleware preflight requests (OPTIONS) handle karta hai
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,  # Settings se load hota hai
    allow_credentials=True,                     # Cookie/auth headers allow
    allow_methods=["*"],                        # All HTTP methods
    allow_headers=["*"],                        # All headers allowed
)
logger.info(f"CORSMiddleware configured with origins: {settings.cors_origins_list}")


# API Router Registration
# V1 API endpoints app se include karte hain
# prefix: URL path mein prepend hota hai (/api/v1 ka prefix har route ke liye)
#
# Example:
# Router mein route: POST /auth/register
# Actual endpoint: POST /api/v1/auth/register
#
# Advantages:
# - API versioning: V1, V2, etc. support
# - Route organization: Separate router files
# - Modular architecture: Routes separately manage
app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX  # "/api/v1" from settings
)
logger.info(f"API router registered with prefix: {settings.API_V1_PREFIX}")

# Posture Tool Router Registration
# Posture analysis endpoints (anterior/lateral/posterior plane)
app.include_router(posture_router)
logger.info("Posture router registered")


# Health Check Endpoint
# Status monitoring ke liye
# Load balancers aur monitoring tools frequently check karte hain
#
# Purpose:
# - Application alive hai verify karna
# - Database connection check nahi karte (fast response)
# - External services dependency avoid karte hain
#
# Usage:
# - Kubernetes liveness probe
# - Docker health check
# - Load balancer routing
# - Monitoring systems (Prometheus, etc.)
#
# Response:
# HTTP 200 OK:
# {
#     "status": "healthy"
# }
@app.get(
    "/health",
    tags=["Health"],
    summary="Application health check",
    description="Simple health check endpoint for monitoring"
)
async def health_check():
    """
    Endpoint ka purpose: Application health monitoring aur status check
    Yeh endpoint simple health status return karta hai.
    
    HTTP Method: GET
    URL: /health
    Status Code: 200 OK (application is running)
    
    Response:
    {
        "status": "healthy"
    }
    
    Use Cases:
    - Kubernetes liveness probe configuration
    - Docker health check script
    - Load balancer routing decisions
    - Monitoring system uptime tracking
    - Application restart trigger (agar unhealthy)
    
    Notes:
    - Database connection check nahi karte (simple fast response)
    - External services check nahi karte (avoid cascading failures)
    - Basic operation verify karte hain (process running, port listening)
    - Security: Public endpoint (no authentication required)
    
    Example:
    curl -X GET http://localhost:8000/health
    Response: {"status":"healthy"}
    """
    
    logger.debug("Health check requested")
    return {"status": "healthy"}


# Application Startup Events (Optional - future use)
# @app.on_event("startup")
# async def startup_event():
#     """
#     Application startup par run hone ke liye
#     Database connections initialize
#     Cache warmup
#     Background tasks start
#     """
#     logger.info("Application starting up")


# Application Shutdown Events (Optional - future use)
# @app.on_event("shutdown")
# async def shutdown_event():
#     """
#     Application shutdown par cleanup
#     Database connections close
#     Background tasks stop
#     Resources release
#     """
#     logger.info("Application shutting down")


# Application Metadata
# FastAPI OpenAPI documentation mein use hota hai
if __name__ == "__main__":
    import uvicorn
    
    # Development server start karte hain
    # Note: Production mein Docker/k8s/external server use karo
    # uvicorn --host 0.0.0.0 --port 8000 --workers 4 app.main:app
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,  # Auto-reload development mein
        log_level="info",
    )
