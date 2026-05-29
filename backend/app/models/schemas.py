"""
UrbanAir — Pydantic Schemas
Request/Response schemas for all API endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── AQI Schemas ───────────────────────────────────────────────

class PollutantData(BaseModel):
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    co: Optional[float] = None
    so2: Optional[float] = None


class AQIResponse(BaseModel):
    aqi: int
    city: Optional[str] = None
    dominant_pollutant: Optional[str] = "pm25"
    pollutants: Optional[Dict[str, Any]] = {}
    temp: Optional[float] = None
    humidity: Optional[float] = None
    wind: Optional[float] = None
    level: Optional[str] = None
    color: Optional[str] = None
    source: Optional[str] = "simulated"
    time: Optional[str] = None

    class Config:
        extra = "allow"


class ZoneData(BaseModel):
    id: int
    name: str
    type: str
    type_label: str
    icon: Optional[str] = ""
    risk: Optional[str] = "MODERATE"
    lat: float
    lng: float
    aqi: int
    level: str
    color: str
    trend: Optional[str] = "→"
    trend_pct: Optional[int] = 0
    radius: Optional[int] = 300
    dist_km: Optional[float] = 1.0
    pm25: Optional[int] = None
    pm10: Optional[int] = None
    no2: Optional[int] = None
    description: Optional[str] = ""
    health_advisory: Optional[str] = ""

    class Config:
        extra = "allow"


class MicrozoneResponse(BaseModel):
    center: Dict[str, float]
    city: Optional[str] = None
    base_aqi: int
    zone_count: int
    zones: List[ZoneData]
    generated_at: Optional[str] = None
    coverage_km: Optional[float] = 3.0

    class Config:
        extra = "allow"


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float


class HeatmapResponse(BaseModel):
    points: List[List[float]]  # [lat, lng, intensity]
    base_aqi: int
    zoom: int

    class Config:
        extra = "allow"


# ── Forecast Schemas ──────────────────────────────────────────

class HourlyForecastItem(BaseModel):
    hour: int
    label: str
    time: str
    date: Optional[str] = None
    aqi: int
    level: str
    color: str
    pm25: Optional[int] = None
    is_peak: bool = False
    is_rush_hour: bool = False


class DailyForecastItem(BaseModel):
    day: str
    date: str
    aqi: int
    level: str
    color: str
    is_today: bool = False
    is_forecast: bool = False
    is_weekend: bool = False


class HourlyForecastResponse(BaseModel):
    city: Optional[str] = None
    base_aqi: int
    hourly: List[HourlyForecastItem]
    peak: Optional[HourlyForecastItem] = None
    low: Optional[HourlyForecastItem] = None
    next_rush_hour_aqi: Optional[int] = None
    generated_at: Optional[str] = None

    class Config:
        extra = "allow"


class WeeklyForecastResponse(BaseModel):
    city: Optional[str] = None
    weekly: List[DailyForecastItem]
    avg_aqi: Optional[int] = None
    generated_at: Optional[str] = None

    class Config:
        extra = "allow"


# ── Insight Schemas ───────────────────────────────────────────

class ActivityItem(BaseModel):
    activity: str
    safe: bool
    note: Optional[str] = None


class AlertItem(BaseModel):
    level: str  # info | warning | danger | critical
    text: str


class HealthRecommendationResponse(BaseModel):
    aqi: int
    city: str
    summary: str
    recommendations: List[str] = []
    alerts: List[AlertItem] = []
    activities: List[ActivityItem] = []
    dominant_pollutant: str = "pm25"
    pollutant_info: Optional[Dict[str, Any]] = None
    time_tips: List[str] = []
    is_rush_hour: bool = False
    mask_required: bool = False
    air_purifier_advised: bool = False
    window_ventilation_ok: bool = True
    risk_score: int = 0
    generated_at: Optional[str] = None

    class Config:
        extra = "allow"


# ── Hotspot Schemas ───────────────────────────────────────────

class HotspotResponse(BaseModel):
    city: Optional[str] = None
    threshold: int
    hotspot_count: int
    hotspots: List[ZoneData]
    coverage_radius_km: float = 3.0
    base_aqi: Optional[int] = None

    class Config:
        extra = "allow"


# ── Auth Schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: str
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ── Location Schemas ──────────────────────────────────────────

class LocationSearchResult(BaseModel):
    name: str
    full: Optional[str] = None
    lat: float
    lng: float
    meta: Optional[str] = None


class LocationSearchResponse(BaseModel):
    results: List[LocationSearchResult]
    count: int
