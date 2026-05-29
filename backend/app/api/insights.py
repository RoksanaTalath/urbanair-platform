"""
UrbanAir — AI Insights & Health Recommendation Engine
Context-aware health advice based on pollution data, time of day, and zone type.
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query

from app.services.cache_service import cache
from app.services.microclimate_engine import MicroclimatEngine
from app.config.settings import settings

logger = logging.getLogger("urbanair.api.insights")
router = APIRouter()
engine = MicroclimatEngine()


POLLUTANT_INFO = {
    "pm25": {
        "name": "PM2.5 (Fine Particles)",
        "source": "Vehicle exhaust, industrial burning, cooking smoke, biomass burning",
        "health_impact": "Penetrates deep into lungs and bloodstream. Causes respiratory and cardiovascular disease with long-term exposure.",
        "icon": "💨",
        "safe_limit_ugm3": 12,
    },
    "pm10": {
        "name": "PM10 (Coarse Particles)",
        "source": "Road dust, construction activity, soil erosion, pollen",
        "health_impact": "Irritates airways and eyes. Worsens asthma, bronchitis, and allergies.",
        "icon": "🌫",
        "safe_limit_ugm3": 50,
    },
    "no2": {
        "name": "Nitrogen Dioxide (NO₂)",
        "source": "Vehicle engines, power plants, industrial combustion",
        "health_impact": "Inflames the lining of airways. Long-term exposure linked to lung disease development.",
        "icon": "🚗",
        "safe_limit_ppb": 53,
    },
    "o3": {
        "name": "Ground-level Ozone (O₃)",
        "source": "Photochemical reaction of NOx and VOCs in sunlight",
        "health_impact": "Triggers chest pain, coughing, throat irritation. Reduces lung function.",
        "icon": "☀️",
        "safe_limit_ppb": 70,
    },
    "co": {
        "name": "Carbon Monoxide (CO)",
        "source": "Incomplete combustion from vehicles and industrial processes",
        "health_impact": "Reduces blood's ability to carry oxygen. Dangerous at high concentrations.",
        "icon": "🏭",
        "safe_limit_ppm": 9,
    },
    "so2": {
        "name": "Sulfur Dioxide (SO₂)",
        "source": "Coal power plants, diesel generators, metal smelting",
        "health_impact": "Irritates eyes, nose, and respiratory tract. Causes acid rain.",
        "icon": "⚠️",
        "safe_limit_ppb": 75,
    },
}


def generate_recommendations(aqi: int, city: str, dominant: str, zone_type: Optional[str] = None) -> dict:
    """Generate AI health recommendations based on AQI and context."""
    hour = datetime.now().hour
    is_rush_hour = (7 <= hour <= 10) or (17 <= hour <= 20)
    is_morning = 5 <= hour <= 9
    is_afternoon = 11 <= hour <= 15

    level_label = (
        "Good" if aqi <= 50 else
        "Moderate" if aqi <= 100 else
        "Unhealthy for Sensitive Groups" if aqi <= 150 else
        "Unhealthy" if aqi <= 200 else
        "Very Unhealthy" if aqi <= 300 else
        "Hazardous"
    )

    recommendations = []
    alerts = []
    activities = []
    time_tips = []

    if aqi <= 50:
        recommendations = [
            f"Air quality in {city} is GOOD. Enjoy outdoor activities freely.",
            "This is a great day for running, cycling, or outdoor sports.",
            "Open windows for natural ventilation to improve indoor air quality.",
        ]
        activities = [
            {"activity": "Outdoor jogging/running", "safe": True, "note": "Excellent conditions"},
            {"activity": "Cycling", "safe": True, "note": "No restrictions"},
            {"activity": "Children's outdoor play", "safe": True, "note": "Unrestricted"},
            {"activity": "Morning yoga outside", "safe": True, "note": "Perfect air quality"},
        ]

    elif aqi <= 100:
        recommendations = [
            f"Air quality in {city} is MODERATE. Acceptable for most people.",
            "Unusually sensitive individuals may experience minor effects.",
            "Consider wearing a mask on high-traffic roads.",
        ]
        activities = [
            {"activity": "Light jogging", "safe": True, "note": "Fine for healthy adults"},
            {"activity": "Cycling on busy roads", "safe": False, "note": "Use quieter routes"},
            {"activity": "Children's outdoor play", "safe": True, "note": "Short sessions preferred"},
            {"activity": "Indoor exercise", "safe": True, "note": "Always a good option"},
        ]

    elif aqi <= 150:
        recommendations = [
            f"Air quality in {city} is UNHEALTHY FOR SENSITIVE GROUPS.",
            "Children, elderly, and people with heart/lung conditions should limit outdoor exertion.",
            f"Industrial zones and traffic corridors are significantly worse than average. {level_label} conditions detected.",
            "Consider N95 mask for outdoor commuting.",
        ]
        alerts.append({"level": "warning", "text": "Sensitive groups (children, elderly, asthma patients) should limit outdoor time to under 30 minutes."})
        activities = [
            {"activity": "Strenuous outdoor exercise", "safe": False, "note": "Move to indoor gym"},
            {"activity": "Short walks (< 30 min)", "safe": True, "note": "Keep it brief"},
            {"activity": "Children outdoor play", "safe": False, "note": "Maximum 1 hour"},
            {"activity": "Commuting by foot", "safe": True, "note": "Wear N95 mask"},
        ]

    elif aqi <= 200:
        recommendations = [
            f"UNHEALTHY air quality in {city}. Everyone should reduce outdoor activities.",
            "Active children and adults should avoid prolonged outdoor exertion.",
            "Run air purifiers indoors. Keep windows closed.",
            "N95/KN95 mask is strongly recommended for any outdoor exposure.",
            "Pregnant women and people with respiratory conditions must stay indoors.",
        ]
        alerts.append({"level": "danger", "text": "Unhealthy for ALL population groups. Reduce outdoor activities significantly."})
        activities = [
            {"activity": "All outdoor exercise", "safe": False, "note": "Stay indoors"},
            {"activity": "Commuting outdoors", "safe": False, "note": "Use covered transport"},
            {"activity": "Window ventilation", "safe": False, "note": "Keep windows closed"},
            {"activity": "Indoor exercise with purifier", "safe": True, "note": "Recommended"},
        ]

    else:
        recommendations = [
            f"HAZARDOUS conditions in {city}. This is a PUBLIC HEALTH EMERGENCY.",
            "Avoid ALL outdoor exposure. Everyone should stay indoors.",
            "Seal doors and windows. Run air purifiers on maximum.",
            "N95 mask is mandatory if outdoor exposure is unavoidable.",
            "Seek immediate medical attention if experiencing breathing difficulty.",
            "Pregnant women, children, elderly: DO NOT go outdoors under any circumstances.",
        ]
        alerts.append({"level": "critical", "text": "HAZARDOUS: Health emergency. Avoid ALL outdoor activity."})
        activities = [
            {"activity": "Any outdoor activity", "safe": False, "note": "DO NOT go outside"},
            {"activity": "Indoor with sealed windows + purifier", "safe": True, "note": "Stay inside"},
        ]

    # Rush hour warning
    if is_rush_hour and aqi > 80:
        recommendations.append(
            "⚠️ Currently rush hour — traffic corridor AQI is 30-50% higher than city average. "
            "Avoid main roads if possible."
        )

    # Time-specific tips
    if is_morning and aqi > 60:
        time_tips.append("Morning temperature inversion traps pollutants close to ground level. Pollution worse at street level.")
    elif is_afternoon and aqi > 80:
        time_tips.append("Peak ozone hours. UV radiation triggers O₃ formation in areas with high vehicle traffic.")
    elif hour >= 19 and hour <= 22 and aqi > 70:
        time_tips.append("Cooking emissions spike in evenings. Residential zones see temporary AQI increases.")

    # Zone-specific advice
    if zone_type in ("industrial", "construction"):
        time_tips.append(f"You're near an {zone_type} zone. PM10 levels here are significantly elevated.")
    elif zone_type == "traffic_corridor":
        time_tips.append("High NO₂ corridor detected. Vehicle emissions are the primary pollutant source here.")
    elif zone_type == "green_space":
        time_tips.append("Green spaces provide 30-50% better air quality than nearby urban zones. Good choice!")

    return {
        "aqi": aqi,
        "city": city,
        "aqi_level": level_label,
        "summary": recommendations[0] if recommendations else "",
        "recommendations": recommendations,
        "alerts": alerts,
        "activities": activities,
        "dominant_pollutant": dominant,
        "pollutant_info": POLLUTANT_INFO.get(dominant, POLLUTANT_INFO["pm25"]),
        "time_tips": time_tips,
        "is_rush_hour": is_rush_hour,
        "mask_required": aqi > 100,
        "air_purifier_advised": aqi > 100,
        "window_ventilation_ok": aqi <= 100,
        "risk_score": min(100, round((aqi / 300) * 100)),
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/health-recommendations")
async def get_health_recommendations(
    aqi: int = Query(..., ge=0, le=500, description="Current AQI value"),
    city: str = Query(..., description="City name"),
    dominant: str = Query("pm25", description="Dominant pollutant"),
    zone_type: Optional[str] = Query(None, description="Zone type (industrial/traffic/residential/green)"),
):
    """
    Generate AI health recommendations for current AQI conditions.
    
    Returns contextual advice including:
    - Activity safety assessment
    - Mask/purifier recommendations  
    - Rush hour warnings
    - Pollutant source explanation
    - Risk score (0-100)
    """
    cache_key = f"insights:health:{aqi // 10}:{city}:{dominant}:{zone_type or 'general'}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    result = generate_recommendations(aqi, city, dominant, zone_type)
    await cache.set(cache_key, result, ttl=settings.INSIGHT_CACHE_TTL)
    return result


@router.get("/city-summary")
async def get_city_summary(
    city: str = Query(...),
    lat: float = Query(...),
    lng: float = Query(...),
):
    """Get comprehensive AI-generated environmental summary for a city."""
    from app.api.aqi import _fetch_waqi_api

    base = await _fetch_waqi_api(lat, lng, city)
    if not base:
        base = engine.simulate_base_aqi(lat, lng, city)

    zones = engine.generate_microzones(lat, lng, base["aqi"], city, count=15)

    if not zones:
        return {"error": "No zone data available"}

    aqis = [z["aqi"] for z in zones]
    avg_aqi = round(sum(aqis) / len(aqis))
    worst = zones[0]
    best = zones[-1]
    high_risk = [z for z in zones if z["aqi"] > 150]

    zone_type_avgs = {}
    for z in zones:
        t = z["type"]
        if t not in zone_type_avgs:
            zone_type_avgs[t] = {"total": 0, "count": 0}
        zone_type_avgs[t]["total"] += z["aqi"]
        zone_type_avgs[t]["count"] += 1

    type_summary = {
        t: round(v["total"] / v["count"])
        for t, v in zone_type_avgs.items()
    }

    recommendations = generate_recommendations(base["aqi"], city, base.get("dominant_pollutant", "pm25"))

    return {
        "city": city,
        "current_aqi": base,
        "analysis": {
            "average_zone_aqi": avg_aqi,
            "aqi_spread": max(aqis) - min(aqis),
            "worst_zone": {"name": worst["name"], "aqi": worst["aqi"], "type": worst["typeLabel"]},
            "best_zone": {"name": best["name"],  "aqi": best["aqi"],  "type": best["typeLabel"]},
            "high_risk_zone_count": len(high_risk),
            "high_risk_pct": round(len(high_risk) / len(zones) * 100),
            "zone_type_averages": type_summary,
        },
        "health_recommendations": recommendations,
        "generated_at": datetime.utcnow().isoformat(),
    }


@router.get("/pollutant-info/{pollutant}")
async def get_pollutant_info(pollutant: str):
    """Get detailed information about a specific pollutant."""
    info = POLLUTANT_INFO.get(pollutant.lower())
    if not info:
        return {
            "error": f"Pollutant '{pollutant}' not found",
            "available": list(POLLUTANT_INFO.keys()),
        }
    return {"pollutant": pollutant, "info": info}
