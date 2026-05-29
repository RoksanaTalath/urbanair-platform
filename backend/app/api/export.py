"""
UrbanAir — Export API
Generate downloadable AQI reports in JSON and CSV format.
PDF export requires WeasyPrint (optional dependency).
"""
import csv
import json
import logging
from datetime import datetime
from typing import Optional
from io import StringIO

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse, JSONResponse

from app.services.microclimate_engine import MicroclimatEngine
from app.api.aqi import _fetch_waqi_api

logger = logging.getLogger("urbanair.api.export")
router = APIRouter()
engine = MicroclimatEngine()


@router.get("/json")
async def export_json(
    lat: float = Query(...),
    lng: float = Query(...),
    city: str = Query("Unknown"),
):
    """Export full pollution report as JSON."""
    base = await _fetch_waqi_api(lat, lng, city)
    if not base:
        base = engine.simulate_base_aqi(lat, lng, city)

    zones = engine.generate_microzones(lat, lng, base["aqi"], city, count=20)

    report = {
        "report_generated": datetime.utcnow().isoformat(),
        "city": city,
        "coordinates": {"lat": lat, "lng": lng},
        "current_aqi": {
            "value": base["aqi"],
            "level": base.get("level"),
            "dominant_pollutant": base.get("dominant_pollutant"),
            "pollutants": base.get("pollutants", {}),
            "weather": {
                "temperature": base.get("temp"),
                "humidity": base.get("humidity"),
                "wind_speed": base.get("wind"),
            },
        },
        "microzone_analysis": {
            "zone_count": len(zones),
            "hotspot_count": len([z for z in zones if z["aqi"] > 150]),
            "average_aqi": round(sum(z["aqi"] for z in zones) / max(len(zones), 1)),
            "worst_zone": zones[0] if zones else None,
            "best_zone": zones[-1] if zones else None,
            "zones": zones,
        },
        "source": base.get("source", "simulated"),
    }

    json_str = json.dumps(report, indent=2, default=str)
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="urbanair_{city}_{datetime.now().strftime("%Y%m%d")}.json"'},
    )


@router.get("/csv")
async def export_csv(
    lat: float = Query(...),
    lng: float = Query(...),
    city: str = Query("Unknown"),
):
    """Export microzone data as CSV."""
    base = engine.simulate_base_aqi(lat, lng, city)
    zones = engine.generate_microzones(lat, lng, base["aqi"], city, count=20)

    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "name", "type", "aqi", "level", "risk",
        "pm25", "pm10", "no2", "lat", "lng", "distance_km"
    ])
    writer.writeheader()
    for z in zones:
        writer.writerow({
            "name": z["name"],
            "type": z.get("type_label", z["type"]),
            "aqi": z["aqi"],
            "level": z["level"],
            "risk": z.get("risk", ""),
            "pm25": z.get("pm25", ""),
            "pm10": z.get("pm10", ""),
            "no2": z.get("no2", ""),
            "lat": z["lat"],
            "lng": z["lng"],
            "distance_km": z.get("dist_km", ""),
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="urbanair_{city}_{datetime.now().strftime("%Y%m%d")}.csv"'},
    )


@router.get("/summary")
async def export_summary(
    lat: float = Query(...),
    lng: float = Query(...),
    city: str = Query("Unknown"),
):
    """Get a quick text summary of current pollution conditions."""
    base = engine.simulate_base_aqi(lat, lng, city)
    zones = engine.generate_microzones(lat, lng, base["aqi"], city, count=20)

    hotspots = [z for z in zones if z["aqi"] > 150]
    avg = round(sum(z["aqi"] for z in zones) / max(len(zones), 1))

    return {
        "summary": {
            "city": city,
            "timestamp": datetime.utcnow().isoformat(),
            "overall_aqi": base["aqi"],
            "overall_level": base.get("level"),
            "average_zone_aqi": avg,
            "total_zones": len(zones),
            "hotspot_zones": len(hotspots),
            "cleanest_zone": zones[-1]["name"] if zones else None,
            "most_polluted_zone": zones[0]["name"] if zones else None,
            "recommendation": (
                "Stay indoors and wear N95 mask outdoors."
                if base["aqi"] > 150
                else "Air quality is acceptable. Limit strenuous outdoor activity."
                if base["aqi"] > 100
                else "Good air quality. Enjoy outdoor activities."
            ),
        }
    }
