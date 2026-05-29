"""
UrbanAir — Hotspot Detection API
Identify high-pollution zones and dangerous areas
"""
import logging
from typing import Optional
from fastapi import APIRouter, Query

from app.services.cache_service import cache
from app.services.microclimate_engine import MicroclimatEngine
from app.api.aqi import _fetch_waqi_api

logger = logging.getLogger("urbanair.api.hotspots")
router = APIRouter()
engine = MicroclimatEngine()


@router.get("/detect")
async def detect_hotspots(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    city: Optional[str] = Query(None, description="City name"),
    threshold: int = Query(150, ge=50, le=400, description="Minimum AQI for hotspot"),
    limit: int = Query(10, ge=1, le=30, description="Max hotspots to return"),
):
    """
    Detect pollution hotspots above threshold AQI.
    
    Returns zones sorted by severity, with type classification,
    health advisory, and exact coordinates.
    """
    cache_key = f"hotspots:{lat:.3f}:{lng:.3f}:{threshold}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Get base AQI
    base = await _fetch_waqi_api(lat, lng, city or "")
    if not base:
        base = engine.simulate_base_aqi(lat, lng, city or "Unknown")

    # Generate all zones
    all_zones = engine.generate_microzones(
        base_lat=lat,
        base_lng=lng,
        base_aqi=base["aqi"],
        city_name=city or "",
        count=20,
    )

    # Filter hotspots
    hotspots = [z for z in all_zones if z["aqi"] >= threshold][:limit]

    # Classify severity
    for h in hotspots:
        h["severity"] = (
            "CRITICAL"    if h["aqi"] > 300 else
            "VERY_HIGH"   if h["aqi"] > 200 else
            "HIGH"        if h["aqi"] > 150 else
            "MODERATE"
        )

    from datetime import datetime
    result = {
        "city": city,
        "center": {"lat": lat, "lng": lng},
        "threshold": threshold,
        "hotspot_count": len(hotspots),
        "total_zones_scanned": len(all_zones),
        "base_aqi": base["aqi"],
        "hotspots": hotspots,
        "coverage_radius_km": 3.0,
        "generated_at": datetime.utcnow().isoformat(),
        "alert_level": (
            "CRITICAL" if any(h["aqi"] > 300 for h in hotspots) else
            "HIGH"     if any(h["aqi"] > 200 for h in hotspots) else
            "MODERATE" if hotspots else
            "SAFE"
        ),
    }

    await cache.set(cache_key, result, ttl=300)
    return result


@router.get("/industrial")
async def get_industrial_zones(
    lat: float = Query(...),
    lng: float = Query(...),
    city: Optional[str] = Query(None),
):
    """Get all industrial and high-pollution zones specifically."""
    base = engine.simulate_base_aqi(lat, lng, city or "Unknown")
    all_zones = engine.generate_microzones(lat, lng, base["aqi"], city or "", count=20)

    industrial = [
        z for z in all_zones
        if z["type"] in ("industrial", "construction", "airport", "traffic_corridor")
    ]

    return {
        "city": city,
        "high_emission_zones": industrial,
        "count": len(industrial),
        "base_aqi": base["aqi"],
    }


@router.get("/safe-zones")
async def get_safe_zones(
    lat: float = Query(...),
    lng: float = Query(...),
    city: Optional[str] = Query(None),
    max_aqi: int = Query(100, description="Maximum AQI to qualify as safe"),
):
    """Find relatively clean/safe zones near a location."""
    base = engine.simulate_base_aqi(lat, lng, city or "Unknown")
    all_zones = engine.generate_microzones(lat, lng, base["aqi"], city or "", count=20)

    safe_zones = sorted(
        [z for z in all_zones if z["aqi"] <= max_aqi],
        key=lambda z: z["aqi"]
    )

    return {
        "city": city,
        "safe_zones": safe_zones,
        "count": len(safe_zones),
        "base_aqi": base["aqi"],
        "threshold": max_aqi,
    }
