"""
UrbanAir — Locations API
City search (Nominatim), saved locations management
"""
import logging
from typing import Optional
import httpx
from fastapi import APIRouter, Query, Depends, HTTPException

from app.config.database import get_collection, is_connected
from app.api.auth import get_optional_user

logger = logging.getLogger("urbanair.api.locations")
router = APIRouter()

# Hardcoded Indian cities for instant results (no API call needed)
INDIAN_CITIES = [
    {"name": "Hyderabad",       "lat": 17.3850, "lng": 78.4867, "meta": "Telangana"},
    {"name": "Bangalore",       "lat": 12.9716, "lng": 77.5946, "meta": "Karnataka"},
    {"name": "Delhi",           "lat": 28.6139, "lng": 77.2090, "meta": "NCT Delhi"},
    {"name": "Mumbai",          "lat": 19.0760, "lng": 72.8777, "meta": "Maharashtra"},
    {"name": "Chennai",         "lat": 13.0827, "lng": 80.2707, "meta": "Tamil Nadu"},
    {"name": "Pune",            "lat": 18.5204, "lng": 73.8567, "meta": "Maharashtra"},
    {"name": "Kolkata",         "lat": 22.5726, "lng": 88.3639, "meta": "West Bengal"},
    {"name": "Ahmedabad",       "lat": 23.0225, "lng": 72.5714, "meta": "Gujarat"},
    {"name": "Noida",           "lat": 28.5355, "lng": 77.3910, "meta": "Uttar Pradesh"},
    {"name": "Gurgaon",         "lat": 28.4595, "lng": 77.0266, "meta": "Haryana"},
    {"name": "Madhapur",        "lat": 17.4486, "lng": 78.3908, "meta": "Hyderabad"},
    {"name": "Gachibowli",      "lat": 17.4399, "lng": 78.3489, "meta": "Hyderabad"},
    {"name": "Hitech City",     "lat": 17.4435, "lng": 78.3772, "meta": "Hyderabad"},
    {"name": "Banjara Hills",   "lat": 17.4126, "lng": 78.4484, "meta": "Hyderabad"},
    {"name": "Secunderabad",    "lat": 17.4399, "lng": 78.4983, "meta": "Hyderabad"},
    {"name": "Jubilee Hills",   "lat": 17.4320, "lng": 78.4072, "meta": "Hyderabad"},
    {"name": "Kondapur",        "lat": 17.4609, "lng": 78.3560, "meta": "Hyderabad"},
    {"name": "Kukatpally",      "lat": 17.4948, "lng": 78.3996, "meta": "Hyderabad"},
    {"name": "Uppal",           "lat": 17.3980, "lng": 78.5590, "meta": "Hyderabad"},
    {"name": "Nacharam",        "lat": 17.4063, "lng": 78.5453, "meta": "Hyderabad"},
    {"name": "Koramangala",     "lat": 12.9352, "lng": 77.6245, "meta": "Bangalore"},
    {"name": "Whitefield",      "lat": 12.9698, "lng": 77.7500, "meta": "Bangalore"},
    {"name": "Indiranagar",     "lat": 12.9784, "lng": 77.6408, "meta": "Bangalore"},
    {"name": "Electronic City", "lat": 12.8399, "lng": 77.6770, "meta": "Bangalore"},
    {"name": "Silk Board",      "lat": 12.9172, "lng": 77.6229, "meta": "Bangalore"},
    {"name": "Connaught Place", "lat": 28.6315, "lng": 77.2167, "meta": "Delhi"},
    {"name": "Anand Vihar",     "lat": 28.6469, "lng": 77.3160, "meta": "Delhi"},
    {"name": "Rohini",          "lat": 28.7041, "lng": 77.1025, "meta": "Delhi"},
    {"name": "Powai",           "lat": 19.1176, "lng": 72.9060, "meta": "Mumbai"},
    {"name": "Bandra",          "lat": 19.0596, "lng": 72.8295, "meta": "Mumbai"},
    {"name": "Andheri",         "lat": 19.1136, "lng": 72.8697, "meta": "Mumbai"},
    {"name": "Anna Nagar",      "lat": 13.0850, "lng": 80.2101, "meta": "Chennai"},
    {"name": "Adyar",           "lat": 13.0012, "lng": 80.2565, "meta": "Chennai"},
    {"name": "T Nagar",         "lat": 13.0418, "lng": 80.2341, "meta": "Chennai"},
    {"name": "Salt Lake",       "lat": 22.5897, "lng": 88.4143, "meta": "Kolkata"},
    {"name": "New Town",        "lat": 22.5958, "lng": 88.4912, "meta": "Kolkata"},
    {"name": "Lucknow",         "lat": 26.8467, "lng": 80.9462, "meta": "Uttar Pradesh"},
    {"name": "Jaipur",          "lat": 26.9124, "lng": 75.7873, "meta": "Rajasthan"},
    {"name": "Surat",           "lat": 21.1702, "lng": 72.8311, "meta": "Gujarat"},
    {"name": "Nagpur",          "lat": 21.1458, "lng": 79.0882, "meta": "Maharashtra"},
    {"name": "Patna",           "lat": 25.5941, "lng": 85.1376, "meta": "Bihar"},
    {"name": "Bhopal",          "lat": 23.2599, "lng": 77.4126, "meta": "Madhya Pradesh"},
    {"name": "Indore",          "lat": 22.7196, "lng": 75.8577, "meta": "Madhya Pradesh"},
    {"name": "Visakhapatnam",   "lat": 17.6868, "lng": 83.2185, "meta": "Andhra Pradesh"},
    {"name": "Coimbatore",      "lat": 11.0168, "lng": 76.9558, "meta": "Tamil Nadu"},
    {"name": "Kochi",           "lat": 9.9312,  "lng": 76.2673, "meta": "Kerala"},
    {"name": "Chandigarh",      "lat": 30.7333, "lng": 76.7794, "meta": "Punjab/Haryana"},
    {"name": "Vadodara",        "lat": 22.3072, "lng": 73.1812, "meta": "Gujarat"},
]


@router.get("/search")
async def search_locations(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
):
    """
    Search for cities and localities.
    
    - First searches hardcoded Indian city database (instant)
    - Then queries Nominatim OSM API for additional results
    """
    q_lower = q.lower().strip()

    # Local search first
    local_results = [
        city for city in INDIAN_CITIES
        if q_lower in city["name"].lower() or q_lower in city["meta"].lower()
    ][:6]

    # Nominatim search for anything not found locally
    nominatim_results = []
    if len(local_results) < 4:
        try:
            async with httpx.AsyncClient(
                headers={"User-Agent": "UrbanAir/2.0 (urbanair-app)"},
                timeout=6,
            ) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": q,
                        "format": "json",
                        "limit": 5,
                        "countrycodes": "in",  # India only
                        "addressdetails": 1,
                    }
                )
                data = response.json()
                for item in data:
                    name = item.get("display_name", "").split(",")[0].strip()
                    addr = item.get("address", {})
                    meta = addr.get("state", addr.get("county", "India"))
                    nominatim_results.append({
                        "name": name,
                        "lat": float(item["lat"]),
                        "lng": float(item["lon"]),
                        "meta": meta,
                        "full": item.get("display_name", ""),
                    })
        except Exception as e:
            logger.warning(f"Nominatim search failed: {e}")

    # Merge, deduplicate by name
    seen_names = {r["name"].lower() for r in local_results}
    for r in nominatim_results:
        if r["name"].lower() not in seen_names:
            local_results.append(r)
            seen_names.add(r["name"].lower())

    results = local_results[:8]
    return {
        "results": results,
        "count": len(results),
        "query": q,
    }


@router.get("/popular")
async def get_popular_cities():
    """Get list of popular Indian cities for quick selection."""
    popular = [
        "Hyderabad", "Bangalore", "Delhi", "Mumbai", "Chennai",
        "Pune", "Kolkata", "Ahmedabad", "Noida", "Gurgaon"
    ]
    cities = [c for c in INDIAN_CITIES if c["name"] in popular]
    return {"cities": cities, "count": len(cities)}


@router.get("/saved")
async def get_saved_locations(
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Get saved locations for authenticated user."""
    if not current_user:
        raise HTTPException(401, "Authentication required to view saved locations")

    if is_connected():
        locations_col = get_collection("saved_locations")
        if locations_col is not None:
            docs = await locations_col.find(
                {"user_id": current_user["sub"]}
            ).sort("created_at", -1).to_list(50)
            for d in docs:
                d["id"] = str(d.pop("_id", ""))
            return {"locations": docs, "count": len(docs)}

    return {"locations": [], "count": 0, "note": "Database not connected"}


@router.post("/saved")
async def save_location(
    name: str = Query(...),
    lat: float = Query(...),
    lng: float = Query(...),
    is_favorite: bool = Query(False),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Save a location for the authenticated user."""
    if not current_user:
        raise HTTPException(401, "Authentication required")

    from datetime import datetime
    import uuid

    doc = {
        "_id": str(uuid.uuid4()),
        "user_id": current_user["sub"],
        "name": name,
        "lat": lat,
        "lng": lng,
        "is_favorite": is_favorite,
        "created_at": datetime.utcnow(),
        "last_checked": datetime.utcnow(),
    }

    if is_connected():
        locations_col = get_collection("saved_locations")
        if locations_col is not None:
            await locations_col.insert_one(doc)

    return {"message": f"Location '{name}' saved successfully", "location": doc}
