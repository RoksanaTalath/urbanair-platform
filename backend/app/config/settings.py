"""
UrbanAir — Application Settings
All configuration via environment variables with safe defaults.
Copy .env.example to .env and fill in your values.
"""
import os
from typing import List


class Settings:
    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = os.getenv("APP_NAME", "UrbanAir")
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "urbanair-dev-secret-key-change-in-production-32chars")

    # ── MongoDB ───────────────────────────────────────────────
    # Defaults to LOCAL MongoDB (no auth required for local dev)
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "urbanair")

    # ── External APIs ─────────────────────────────────────────
    # Get free WAQI token: https://aqicn.org/data-platform/token/
    WAQI_API_TOKEN: str = os.getenv("WAQI_API_TOKEN", "demo")
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    NOMINATIM_URL: str = "https://nominatim.openstreetmap.org"

    # ── JWT Auth ──────────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "urbanair-jwt-secret-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

    # ── CORS ──────────────────────────────────────────────────
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        raw = os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
        )
        # Handle both JSON array and comma-separated
        raw = raw.strip().strip("[]").replace('"', '').replace("'", "")
        origins = [o.strip() for o in raw.split(",") if o.strip()]
        # Always include localhost variants
        defaults = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        return list(set(origins + defaults))

    # ── Cache TTL (seconds) ───────────────────────────────────
    AQI_CACHE_TTL: int = int(os.getenv("AQI_CACHE_TTL", "300"))        # 5 min
    FORECAST_CACHE_TTL: int = int(os.getenv("FORECAST_CACHE_TTL", "900"))  # 15 min
    INSIGHT_CACHE_TTL: int = int(os.getenv("INSIGHT_CACHE_TTL", "600"))    # 10 min

    # ── Rate Limiting ─────────────────────────────────────────
    RATE_LIMIT_CALLS: int = int(os.getenv("RATE_LIMIT_CALLS", "200"))
    RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))

    # ── Microclimate Engine ───────────────────────────────────
    MICROZONE_COUNT: int = int(os.getenv("MICROZONE_COUNT", "20"))
    HOTSPOT_RADIUS_KM: float = float(os.getenv("HOTSPOT_RADIUS_KM", "3.0"))


settings = Settings()
