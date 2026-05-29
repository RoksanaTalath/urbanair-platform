"""
UrbanAir — AQI API Router
Real-time AQI + hyperlocal microzone endpoints
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import httpx
import logging

from app.config.settings import settings
from app.services.cache_service import cache
from app.services.microclimate_engine import MicroclimatEngine

logger = logging.getLogger("urbanair.api.aqi")
router = APIRouter()
engine = MicroclimatEngine()


@router.get("/current")
async def get_current_aqi(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lng: float = Query(..., ge=-180, le=180, description="Longitude"),
    city: Optional[str] = Query(None, description="City name for better simulation"),
):
    """
    Get real-time AQI for given coordinates.
    
    - Tries WAQI API first (live data)
    - Falls back to city-aware simulation if API unavailable
    - Results cached for 5 minutes
    """
    cache_key = f"aqi:current:{lat:.3f}:{lng:.3f}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Try WAQI API
    aqi_data = await _fetch_waqi_api(lat, lng, city or "")

    # Fallback to simulation
    if not aqi_data:
        aqi_data = engine.simulate_base_aqi(lat, lng, city or "Unknown")
        logger.info(f"Using simulation for {city or f'{lat:.3f},{lng:.3f}'}: AQI={aqi_data['aqi']}")
    else:
        logger.info(f"WAQI data for {city}: AQI={aqi_data['aqi']}")

    await cache.set(cache_key, aqi_data, ttl=settings.AQI_CACHE_TTL)
    return aqi_data


@router.get("/microzones")
async def get_microzones(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    city: Optional[str] = Query(None, description="City name"),
    radius_km: float = Query(3.0, ge=0.5, le=10.0, description="Radius in km"),
    count: int = Query(20, ge=5, le=50, description="Number of zones"),
):
    """
    Generate hyperlocal microzone pollution map.
    
    Returns street-level AQI for up to 50 named zones around a location.
    Each zone has type classification (industrial/traffic/residential/green/etc.)
    """
    cache_key = f"aqi:microzones:{lat:.3f}:{lng:.3f}:{count}:{radius_km}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Get base AQI first
    base_data = await get_current_aqi(lat=lat, lng=lng, city=city)
    base_aqi = base_data.get("aqi", 100)

    # Generate microzone map
    zones = engine.generate_microzones(
        base_lat=lat,
        base_lng=lng,
        base_aqi=base_aqi,
        city_name=city or "",
        count=count,
        radius_km=radius_km,
    )

    from datetime import datetime
    result = {
        "center": {"lat": lat, "lng": lng},
        "city": city,
        "base_aqi": base_aqi,
        "zone_count": len(zones),
        "zones": zones,
        "generated_at": datetime.utcnow().isoformat(),
        "coverage_km": radius_km,
        "hotspot_count": len([z for z in zones if z["aqi"] > 150]),
    }

    await cache.set(cache_key, result, ttl=settings.AQI_CACHE_TTL)
    return result


@router.get("/heatmap")
async def get_heatmap_data(
    lat: float = Query(...),
    lng: float = Query(...),
    zoom: int = Query(13, ge=10, le=18),
    city: Optional[str] = Query(None),
):
    """
    Generate heatmap intensity points for Leaflet.heat layer.
    Returns list of [lat, lng, intensity] tuples.
    """
    cache_key = f"aqi:heatmap:{lat:.3f}:{lng:.3f}:{zoom}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    base_data = await get_current_aqi(lat=lat, lng=lng, city=city)
    base_aqi = base_data.get("aqi", 100)
    points = engine.generate_heatmap_points(lat, lng, base_aqi, zoom)

    result = {"points": points, "base_aqi": base_aqi, "zoom": zoom, "point_count": len(points)}
    await cache.set(cache_key, result, ttl=settings.AQI_CACHE_TTL)
    return result


@router.get("/nearby-stations")
async def get_nearby_stations(
    lat: float = Query(...),
    lng: float = Query(...),
):
    """Fetch nearby WAQI monitoring stations."""
    url = (
        f"https://api.waqi.info/map/bounds/"
        f"?latlng={lat-0.5},{lng-0.5},{lat+0.5},{lng+0.5}"
        f"&token={settings.WAQI_API_TOKEN}"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            data = r.json()
            if data.get("status") == "ok":
                stations = data.get("data", [])
                return {"stations": stations[:20], "count": len(stations)}
    except Exception as e:
        logger.warning(f"Nearby stations fetch failed: {e}")

    return {"stations": [], "count": 0, "note": "WAQI API unavailable"}


@router.get("/cache-stats")
async def get_cache_stats():
    """Get cache performance statistics (admin endpoint)."""
    return cache.get_stats()


async def _fetch_waqi_api(lat: float, lng: float, city: str) -> Optional[dict]:
    """Fetch from WAQI API. Returns None if unavailable."""
    url = f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={settings.WAQI_API_TOKEN}"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(url)
            data = response.json()

        if data.get("status") == "ok":
            w = data.get("data", {})
            if not w.get("aqi") or w["aqi"] == "-":
                return None

            iaqi = w.get("iaqi", {})
            aqi_val = int(w["aqi"])

            from app.services.microclimate_engine import MicroclimatEngine
            level, color = MicroclimatEngine().get_aqi_level(aqi_val)

            return {
                "aqi": aqi_val,
                "city": w.get("city", {}).get("name", city),
                "dominant_pollutant": w.get("dominentpol", "pm25"),
                "pollutants": {
                    "pm25": iaqi.get("pm25", {}).get("v"),
                    "pm10": iaqi.get("pm10", {}).get("v"),
                    "no2":  iaqi.get("no2",  {}).get("v"),
                    "o3":   iaqi.get("o3",   {}).get("v"),
                    "co":   iaqi.get("co",   {}).get("v"),
                    "so2":  iaqi.get("so2",  {}).get("v"),
                },
                "temp":     iaqi.get("t", {}).get("v"),
                "humidity": iaqi.get("h", {}).get("v"),
                "wind":     iaqi.get("w", {}).get("v"),
                "level": level,
                "color": color,
                "source": "waqi",
                "time": w.get("time", {}).get("s", ""),
            }
    except Exception as e:
        logger.debug(f"WAQI fetch failed: {e}")

    return None
