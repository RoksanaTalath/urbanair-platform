"""
UrbanAir — FastAPI Backend (Production-Ready)
AI Powered Hyperlocal Microclimate Pollution Intelligence Platform

Run locally:
    uvicorn app.main:app --reload --port 8000

API Docs: http://localhost:8000/api/docs
"""
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.config.database import connect_db, close_db, is_connected

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("urbanair")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("🚀 UrbanAir backend starting up...")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   Debug:   {settings.DEBUG}")
    logger.info(f"   DB URL:  {settings.MONGODB_URL[:40]}...")

    # Connect to MongoDB (non-fatal if fails)
    await connect_db()

    if is_connected():
        logger.info("✅ MongoDB ready")
    else:
        logger.warning("⚠️  Running without MongoDB — data won't be persisted")

    logger.info("✅ UrbanAir API ready at http://localhost:8000")
    logger.info("📚 Docs available at http://localhost:8000/api/docs")

    yield

    # Shutdown
    await close_db()
    logger.info("🛑 UrbanAir backend shut down cleanly")


# ── Create FastAPI App ────────────────────────────────────────
app = FastAPI(
    title="UrbanAir API",
    description="""
## 🌐 UrbanAir — Hyperlocal Microclimate Pollution Intelligence

**The most granular urban air quality API for Indian cities.**

### Key Endpoints
- `/api/v1/aqi/current` — Real-time AQI for any coordinates
- `/api/v1/aqi/microzones` — 20 street-level zone readings
- `/api/v1/forecast/hourly` — 24-hour AQI prediction
- `/api/v1/insights/health-recommendations` — AI health advice
- `/api/v1/hotspots/detect` — Pollution hotspot detection

### Indian Cities Supported
Hyderabad, Bangalore, Delhi, Mumbai, Chennai, Pune, Kolkata, Ahmedabad, Noida, Gurgaon and all localities.
    """,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# ── Middleware Stack ──────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


# Request timing middleware
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000)
    response.headers["X-Response-Time"] = f"{duration_ms}ms"
    if request.url.path.startswith("/api/"):
        logger.info(
            f"{request.method:6} {request.url.path:<50} "
            f"→ {response.status_code} [{duration_ms}ms]"
        )
    return response


# ── Include Routers ───────────────────────────────────────────
from app.api import aqi, forecast, hotspots, insights, auth, locations, export

app.include_router(auth.router,       prefix="/api/v1/auth",       tags=["🔐 Authentication"])
app.include_router(aqi.router,        prefix="/api/v1/aqi",        tags=["🌡 AQI Data"])
app.include_router(forecast.router,   prefix="/api/v1/forecast",   tags=["📈 Forecasting"])
app.include_router(hotspots.router,   prefix="/api/v1/hotspots",   tags=["🔥 Hotspot Detection"])
app.include_router(insights.router,   prefix="/api/v1/insights",   tags=["🧠 AI Insights"])
app.include_router(locations.router,  prefix="/api/v1/locations",  tags=["📍 Locations"])
app.include_router(export.router,     prefix="/api/v1/export",     tags=["📄 Export"])


# ── Root & Health Endpoints ───────────────────────────────────
@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    return {
        "service": "UrbanAir API",
        "version": settings.APP_VERSION,
        "status": "operational",
        "description": "AI-Powered Hyperlocal Microclimate Pollution Intelligence",
        "docs": "/api/docs",
        "health": "/api/health",
        "database": "connected" if is_connected() else "disconnected (simulation mode)",
    }


@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "urbanair-backend",
        "version": settings.APP_VERSION,
        "database": {
            "connected": is_connected(),
            "mode": "mongodb" if is_connected() else "simulation",
        },
        "features": [
            "street-level-aqi",
            "microclimate-simulation",
            "hotspot-detection",
            "ai-health-recommendations",
            "24h-forecast",
            "jwt-authentication",
        ],
    }


# ── Error Handlers ────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "path": str(request.url.path),
            "docs": "/api/docs",
        }
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Internal error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error. Check server logs."}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )
