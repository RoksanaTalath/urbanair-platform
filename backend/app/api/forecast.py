"""
UrbanAir — Forecast Analytics API
24-hour AQI prediction and 7-day trend engine.
Uses urban diurnal pollution cycle modeling for Indian cities.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import random

from fastapi import APIRouter, Query

from app.services.cache_service import cache
from app.services.microclimate_engine import MicroclimatEngine
from app.config.settings import settings

logger = logging.getLogger("urbanair.api.forecast")
router = APIRouter()
engine = MicroclimatEngine()


# Hourly pollution factors for Indian cities
# Based on typical traffic and industrial patterns
HOURLY_FACTORS = [
    0.68, 0.62, 0.58, 0.55, 0.57, 0.65,   # 00–05 AM: lowest (night settlement)
    0.80, 1.10, 1.28, 1.20, 1.08, 1.05,   # 06–11 AM: morning rush peak at 08
    1.10, 1.15, 1.18, 1.15, 1.12, 1.30,   # 12–17 PM: afternoon + pre-rush
    1.38, 1.35, 1.20, 1.05, 0.90, 0.75,   # 18–23 PM: evening rush → night
]

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _get_level_color(aqi: int):
    """Return (level_label, hex_color) for an AQI value."""
    if aqi <= 50:   return "Good", "#00e400"
    if aqi <= 100:  return "Moderate", "#ffff00"
    if aqi <= 150:  return "Unhealthy for Sensitive", "#ff7e00"
    if aqi <= 200:  return "Unhealthy", "#ff0000"
    if aqi <= 300:  return "Very Unhealthy", "#8f3f97"
    return "Hazardous", "#7e0023"


def build_hourly_forecast(base_aqi: int) -> list:
    """
    Build 24-hour AQI forecast using diurnal pollution cycle.
    Rush hours (7-9AM, 5-8PM) show 25-38% higher AQI.
    Night hours (12-5AM) show 35-45% lower AQI.
    """
    now = datetime.now()
    forecast = []

    for i in range(24):
        future_time = now + timedelta(hours=i)
        hour = future_time.hour
        factor = HOURLY_FACTORS[hour]

        # Add realistic noise
        seed_val = (base_aqi * 7 + hour * 13 + i * 3) % 100
        noise = 0.88 + (seed_val / 100.0) * 0.24

        aqi = max(5, min(500, round(base_aqi * factor * noise)))
        level, color = _get_level_color(aqi)

        is_rush = (7 <= hour <= 10) or (17 <= hour <= 20)

        forecast.append({
            "hour": hour,
            "label": "Now" if i == 0 else f"+{i}h",
            "time": future_time.strftime("%H:%M"),
            "date": future_time.strftime("%Y-%m-%d"),
            "aqi": aqi,
            "level": level,
            "color": color,
            "pm25": round(aqi * 0.45 * (0.9 + (seed_val % 20) / 100)),
            "is_peak": factor >= 1.28,
            "is_rush_hour": is_rush,
        })

    return forecast


def build_weekly_trend(base_aqi: int) -> list:
    """
    7-day AQI trend: 3 days historical + today + 3 days forecast.
    Weekends are ~12% cleaner (less industrial/traffic activity).
    """
    today = datetime.now()
    trend = []

    for i in range(7):
        offset = i - 3  # -3 to +3 from today
        date_obj = today + timedelta(days=offset)
        weekday = date_obj.weekday()  # 0=Mon, 6=Sun
        is_weekend = weekday >= 5

        # Weekend factor: 12% cleaner
        weekend_factor = 0.88 if is_weekend else 1.0

        # Variation seed from date
        seed_val = (base_aqi * 3 + date_obj.day * 7 + i * 11) % 100
        noise = 0.82 + (seed_val / 100.0) * 0.36

        aqi = max(5, min(500, round(base_aqi * weekend_factor * noise)))
        level, color = _get_level_color(aqi)

        trend.append({
            "day": DAYS[weekday],
            "date": date_obj.strftime("%Y-%m-%d"),
            "aqi": aqi,
            "level": level,
            "color": color,
            "is_today": offset == 0,
            "is_forecast": offset > 0,
            "is_weekend": is_weekend,
        })

    return trend


@router.get("/hourly")
async def get_hourly_forecast(
    lat: float = Query(...),
    lng: float = Query(...),
    city: Optional[str] = Query(None),
    base_aqi: Optional[int] = Query(None, ge=0, le=500),
):
    """
    Get 24-hour AQI forecast with rush-hour modeling.
    
    Returns hourly predictions showing pollution peaks and valleys,
    with flags for peak hours and rush hour periods.
    """
    cache_key = f"forecast:hourly:{lat:.2f}:{lng:.2f}:{datetime.now().strftime('%Y%m%d%H')}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Get base AQI if not provided
    if base_aqi is None:
        from app.api.aqi import _fetch_waqi_api
        data = await _fetch_waqi_api(lat, lng, city or "")
        base_aqi = data["aqi"] if data else engine.simulate_base_aqi(lat, lng, city or "")["aqi"]

    hourly = build_hourly_forecast(base_aqi)

    # Find peak and lowest hours
    peak = max(hourly, key=lambda h: h["aqi"])
    low = min(hourly, key=lambda h: h["aqi"])
    next_rush = next((h for h in hourly if h["is_rush_hour"]), None)

    result = {
        "city": city,
        "base_aqi": base_aqi,
        "hourly": hourly,
        "peak_hour": peak,
        "lowest_hour": low,
        "next_rush_hour": next_rush,
        "generated_at": datetime.utcnow().isoformat(),
        "model": "urban-diurnal-cycle-v2",
    }

    await cache.set(cache_key, result, ttl=settings.FORECAST_CACHE_TTL)
    return result


@router.get("/weekly")
async def get_weekly_trend(
    lat: float = Query(...),
    lng: float = Query(...),
    city: Optional[str] = Query(None),
    base_aqi: Optional[int] = Query(None),
):
    """
    Get 7-day AQI trend (3 historical + today + 3 forecast).
    Weekends show ~12% improvement due to reduced traffic/industry.
    """
    today_str = datetime.now().strftime('%Y%m%d')
    cache_key = f"forecast:weekly:{lat:.2f}:{lng:.2f}:{today_str}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if base_aqi is None:
        base_aqi = engine.simulate_base_aqi(lat, lng, city or "")["aqi"]

    weekly = build_weekly_trend(base_aqi)
    avg_aqi = round(sum(d["aqi"] for d in weekly) / len(weekly))

    result = {
        "city": city,
        "weekly": weekly,
        "avg_aqi": avg_aqi,
        "best_day": min(weekly, key=lambda d: d["aqi"]),
        "worst_day": max(weekly, key=lambda d: d["aqi"]),
        "generated_at": datetime.utcnow().isoformat(),
    }

    await cache.set(cache_key, result, ttl=settings.FORECAST_CACHE_TTL)
    return result


@router.get("/rush-hours")
async def get_rush_hour_info(
    lat: float = Query(...),
    lng: float = Query(...),
    city: Optional[str] = Query(None),
):
    """Get rush hour AQI predictions for the day."""
    base_aqi = engine.simulate_base_aqi(lat, lng, city or "")["aqi"]
    hourly = build_hourly_forecast(base_aqi)

    morning_rush = [h for h in hourly if 7 <= h["hour"] <= 9]
    evening_rush = [h for h in hourly if 17 <= h["hour"] <= 20]

    return {
        "city": city,
        "morning_rush": {
            "hours": "7:00 AM – 9:00 AM",
            "forecast": morning_rush,
            "peak_aqi": max(h["aqi"] for h in morning_rush) if morning_rush else base_aqi,
        },
        "evening_rush": {
            "hours": "5:00 PM – 8:00 PM",
            "forecast": evening_rush,
            "peak_aqi": max(h["aqi"] for h in evening_rush) if evening_rush else base_aqi,
        },
        "advice": "Avoid heavy traffic roads during rush hours to reduce exposure by 30-50%.",
    }
