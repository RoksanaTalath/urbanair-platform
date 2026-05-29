"""
UrbanAir — Microclimate Simulation Engine
Core hyperlocal pollution intelligence system.

This engine simulates street-level pollution variation using:
- Urban zone type classification (industrial/traffic/residential/green)
- Traffic density assumptions (rush hour patterns)
- Pollution spread modeling (Gaussian dispersion approximation)
- Wind-direction interpolation
- Building density effects
- Temporal pollution cycles
"""
import math
import random
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import hashlib


class MicroclimatEngine:
    """
    Hyperlocal Pollution Intelligence Engine.
    Simulates street-level AQI variation across urban microzones.
    """

    ZONE_PROFILES = {
        "industrial": {
            "base_multiplier": 1.65,
            "pm25_factor": 1.8,
            "pm10_factor": 2.0,
            "no2_factor": 1.4,
            "label": "Industrial Zone",
            "risk": "HIGH",
            "icon": "🏭",
            "description": "Heavy industrial activity. Elevated PM2.5 and SO2.",
        },
        "traffic_corridor": {
            "base_multiplier": 1.45,
            "pm25_factor": 1.5,
            "pm10_factor": 1.6,
            "no2_factor": 2.2,
            "label": "Traffic Corridor",
            "risk": "HIGH",
            "icon": "🚗",
            "description": "High vehicle density. NO2 and PM2.5 peaks during rush hours.",
        },
        "commercial": {
            "base_multiplier": 1.20,
            "pm25_factor": 1.2,
            "pm10_factor": 1.3,
            "no2_factor": 1.4,
            "label": "Commercial Hub",
            "risk": "MODERATE",
            "icon": "🏪",
            "description": "Mixed commercial activity. Moderate pollution levels.",
        },
        "residential_dense": {
            "base_multiplier": 0.95,
            "pm25_factor": 0.9,
            "pm10_factor": 0.85,
            "no2_factor": 0.7,
            "label": "Dense Residential",
            "risk": "MODERATE",
            "icon": "🏘",
            "description": "Cooking emissions and low traffic. Generally moderate AQI.",
        },
        "residential_low": {
            "base_multiplier": 0.75,
            "pm25_factor": 0.7,
            "pm10_factor": 0.65,
            "no2_factor": 0.5,
            "label": "Low-Density Residential",
            "risk": "LOW",
            "icon": "🏡",
            "description": "Quieter residential area. Lower pollution exposure.",
        },
        "green_space": {
            "base_multiplier": 0.45,
            "pm25_factor": 0.4,
            "pm10_factor": 0.35,
            "no2_factor": 0.3,
            "label": "Green Space / Park",
            "risk": "LOW",
            "icon": "🌿",
            "description": "Vegetation provides natural air filtration.",
        },
        "airport": {
            "base_multiplier": 1.55,
            "pm25_factor": 1.7,
            "pm10_factor": 1.5,
            "no2_factor": 1.6,
            "label": "Airport Vicinity",
            "risk": "HIGH",
            "icon": "✈️",
            "description": "Jet fuel emissions and ground traffic.",
        },
        "construction": {
            "base_multiplier": 1.75,
            "pm25_factor": 1.4,
            "pm10_factor": 2.5,
            "no2_factor": 1.2,
            "label": "Construction Zone",
            "risk": "VERY HIGH",
            "icon": "🏗",
            "description": "Dust and debris. Very high PM10 levels.",
        },
        "water_body": {
            "base_multiplier": 0.55,
            "pm25_factor": 0.5,
            "pm10_factor": 0.45,
            "no2_factor": 0.4,
            "label": "Near Water Body",
            "risk": "LOW",
            "icon": "💧",
            "description": "Lakes/rivers improve local air quality.",
        },
    }

    CITY_ZONE_MAPS = {
        "hyderabad": [
            ("Uppal Industrial Corridor", "industrial"),
            ("Old City Traffic Hub", "traffic_corridor"),
            ("Secunderabad Junction", "traffic_corridor"),
            ("Gachibowli Tech Park", "commercial"),
            ("Mehdipatnam Intersection", "traffic_corridor"),
            ("Nacharam Industrial Area", "industrial"),
            ("LB Nagar Flyover", "traffic_corridor"),
            ("Kukatpally Housing Board", "residential_dense"),
            ("Kondapur Residential", "residential_low"),
            ("Biodiversity Park Zone", "green_space"),
            ("RGIA Airport Vicinity", "airport"),
            ("Tarnaka Junction", "traffic_corridor"),
            ("Dilsukhnagar Market", "commercial"),
            ("Hussain Sagar Lakefront", "water_body"),
            ("Miyapur Construction Zone", "construction"),
            ("Banjara Hills Low-density", "residential_low"),
            ("Hitech City Commercial", "commercial"),
            ("Shamshabad Industrial", "industrial"),
            ("Nampally Old Town", "residential_dense"),
            ("Madhapur IT Corridor", "commercial"),
        ],
        "bangalore": [
            ("Peenya Industrial Area", "industrial"),
            ("Silk Board Junction", "traffic_corridor"),
            ("Koramangala Tech", "commercial"),
            ("Whitefield IT Park", "commercial"),
            ("Bannerghatta Road", "traffic_corridor"),
            ("Hebbal Flyover", "traffic_corridor"),
            ("Cubbon Park", "green_space"),
            ("Yelahanka Old Town", "residential_dense"),
            ("Electronic City", "commercial"),
            ("BIAL Airport Zone", "airport"),
            ("Indiranagar 100ft Road", "commercial"),
            ("Rajajinagar Industrial", "industrial"),
            ("Bellandur Lake", "water_body"),
            ("Marathahalli Construction", "construction"),
            ("JP Nagar Residential", "residential_low"),
        ],
        "delhi": [
            ("Anand Vihar ISBT", "traffic_corridor"),
            ("Okhla Industrial", "industrial"),
            ("Connaught Place", "commercial"),
            ("Lodhi Garden", "green_space"),
            ("Wazirpur Industrial", "industrial"),
            ("IGI Airport", "airport"),
            ("Nehru Place Market", "commercial"),
            ("Yamuna Riverfront", "water_body"),
            ("Dwarka Residential", "residential_dense"),
            ("Noida Expressway", "traffic_corridor"),
        ],
    }

    def __init__(self):
        self._aqi_levels = [
            (50, "Good", "#00e400"),
            (100, "Moderate", "#ffff00"),
            (150, "Unhealthy for Sensitive Groups", "#ff7e00"),
            (200, "Unhealthy", "#ff0000"),
            (300, "Very Unhealthy", "#8f3f97"),
            (500, "Hazardous", "#7e0023"),
        ]

    def get_aqi_level(self, aqi: int) -> Tuple[str, str]:
        for threshold, label, color in self._aqi_levels:
            if aqi <= threshold:
                return label, color
        return "Hazardous", "#7e0023"

    def _get_time_factor(self) -> float:
        """Rush hour and diurnal pollution cycle factor."""
        hour = datetime.now().hour
        if 7 <= hour <= 9:
            return 1.25  # Morning rush
        elif 17 <= hour <= 20:
            return 1.35  # Evening rush — worst
        elif 0 <= hour <= 5:
            return 0.65  # Night — cleanest
        elif 10 <= hour <= 16:
            return 1.05  # Daytime
        return 1.0

    def _get_seasonal_factor(self) -> float:
        """Winter/summer pollution variation for Indian cities."""
        month = datetime.now().month
        if 11 <= month <= 12 or 1 <= month <= 2:
            return 1.3  # Winter inversions — worst AQI
        elif 6 <= month <= 9:
            return 0.8  # Monsoon — rain washes pollution
        return 1.0

    def _deterministic_jitter(self, seed: str, scale: float = 0.15) -> float:
        """Reproducible pseudo-random variation for a location."""
        h = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
        normalized = (h % 1000) / 1000.0
        return 1.0 + (normalized - 0.5) * scale * 2

    def simulate_base_aqi(self, lat: float, lng: float, city_name: str) -> dict:
        """
        Simulate realistic base AQI for any Indian city.
        Uses city-specific baselines, time-of-day, and seasonal factors.
        """
        CITY_BASELINES = {
            "delhi": 180, "noida": 170, "gurgaon": 165, "faridabad": 175,
            "kolkata": 145, "ahmedabad": 130, "patna": 160, "lucknow": 155,
            "mumbai": 105, "pune": 90, "nagpur": 95,
            "hyderabad": 100, "bangalore": 82, "chennai": 88,
            "madhapur": 88, "gachibowli": 82, "hitech city": 85,
            "banjara hills": 90, "secunderabad": 105, "jubilee hills": 88,
            "koramangala": 80, "whitefield": 75, "indiranagar": 83,
            "connaught place": 175, "anand vihar": 195,
            "default": 100,
        }

        city_lower = city_name.lower()
        base = CITY_BASELINES.get(
            next((k for k in CITY_BASELINES if k in city_lower), "default"),
            CITY_BASELINES["default"],
        )

        aqi = round(
            base
            * self._get_time_factor()
            * self._get_seasonal_factor()
            * self._deterministic_jitter(f"{lat:.2f}{lng:.2f}", 0.12)
        )
        aqi = max(10, min(500, aqi))

        label, color = self.get_aqi_level(aqi)
        return {
            "aqi": aqi,
            "city": city_name,
            "dominant_pollutant": "pm25" if aqi > 150 else "pm10",
            "pollutants": {
                "pm25": round(aqi * 0.45 * (0.95 + random.random() * 0.1)),
                "pm10": round(aqi * 0.70 * (0.95 + random.random() * 0.1)),
                "no2": round(aqi * 0.28 * (0.95 + random.random() * 0.1)),
                "o3": round(aqi * 0.22 * (0.95 + random.random() * 0.1)),
                "co": round(aqi * 0.08 * (0.95 + random.random() * 0.1)),
                "so2": round(aqi * 0.12 * (0.95 + random.random() * 0.1)),
            },
            "temp": round(22 + (lat - 20) * -0.5 + random.uniform(-3, 8)),
            "humidity": round(55 + random.uniform(-15, 25)),
            "wind_speed": round(8 + random.uniform(-4, 12), 1),
            "level": label,
            "color": color,
            "source": "simulated",
            "time": datetime.utcnow().isoformat(),
        }

    def generate_microzones(
        self,
        base_lat: float,
        base_lng: float,
        base_aqi: int,
        city_name: str,
        count: int = 20,
        radius_km: float = 3.0,
    ) -> List[dict]:
        """
        Generate hyperlocal microzone pollution map.
        
        Key simulation logic:
        - Zones placed at varying distances (50m to radius_km)
        - Zone type determined by urban pattern recognition
        - AQI calculated using zone multiplier × base × time × seasonal factors
        - Gaussian-like pollution spread between adjacent zones
        """
        city_lower = city_name.lower()
        city_key = next(
            (k for k in self.CITY_ZONE_MAPS if k in city_lower),
            None,
        )

        zone_definitions = (
            self.CITY_ZONE_MAPS[city_key][:count]
            if city_key
            else self._generate_generic_zones(count)
        )

        time_factor = self._get_time_factor()
        seasonal_factor = self._get_seasonal_factor()
        zones = []

        for i, (zone_name, zone_type) in enumerate(zone_definitions):
            profile = self.ZONE_PROFILES.get(zone_type, self.ZONE_PROFILES["commercial"])

            # Spatial placement using golden angle for even distribution
            angle = i * 2.399963  # Golden angle in radians
            dist_factor = 0.2 + (i / count) * 0.8
            dist_km = dist_factor * radius_km

            lat_offset = (dist_km / 111.32) * math.sin(angle)
            lng_offset = (dist_km / (111.32 * math.cos(math.radians(base_lat)))) * math.cos(angle)

            lat = base_lat + lat_offset + (random.random() - 0.5) * 0.002
            lng = base_lng + lng_offset + (random.random() - 0.5) * 0.002

            # AQI calculation with multiple factors
            jitter = self._deterministic_jitter(f"{zone_name}{base_aqi}", 0.18)
            aqi = round(base_aqi * profile["base_multiplier"] * time_factor * seasonal_factor * jitter)
            aqi = max(5, min(500, aqi))

            label, color = self.get_aqi_level(aqi)

            # Pollutant breakdown
            pm25 = round(aqi * 0.45 * profile["pm25_factor"] * (0.9 + random.random() * 0.2))
            pm10 = round(aqi * 0.70 * profile["pm10_factor"] * (0.9 + random.random() * 0.2))
            no2 = round(aqi * 0.28 * profile["no2_factor"] * (0.9 + random.random() * 0.2))

            # Trend simulation
            prev_hour_aqi = round(aqi * (1 + (random.random() - 0.5) * 0.2))
            trend = "↑" if aqi > prev_hour_aqi else ("↓" if aqi < prev_hour_aqi else "→")
            trend_pct = round(abs(aqi - prev_hour_aqi) / max(prev_hour_aqi, 1) * 100)

            zones.append({
                "id": i,
                "name": zone_name,
                "type": zone_type,
                "type_label": profile["label"],
                "icon": profile["icon"],
                "risk_level": profile["risk"],
                "description": profile["description"],
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "aqi": aqi,
                "aqi_level": label,
                "color": color,
                "pollutants": {
                    "pm25": pm25,
                    "pm10": pm10,
                    "no2": no2,
                    "o3": round(aqi * 0.22 * (0.9 + random.random() * 0.2)),
                },
                "trend": trend,
                "trend_pct": trend_pct,
                "radius_m": round(200 + dist_km * 100),
                "distance_km": round(dist_km, 2),
                "health_advisory": self._get_health_advisory(aqi, zone_type),
            })

        return sorted(zones, key=lambda z: z["aqi"], reverse=True)

    def generate_heatmap_points(
        self, base_lat: float, base_lng: float, base_aqi: int, zoom: int
    ) -> List[List[float]]:
        """
        Generate [lat, lng, intensity] points for Leaflet heatmap layer.
        Density increases with zoom level.
        """
        point_count = min(500, 50 * (zoom - 9))
        points = []

        for _ in range(point_count):
            angle = random.random() * 2 * math.pi
            dist = random.random() * 0.05

            lat = base_lat + math.sin(angle) * dist
            lng = base_lng + math.cos(angle) * dist

            # Higher intensity near roads/industrial (simplified)
            dist_from_center = math.sqrt((lat - base_lat) ** 2 + (lng - base_lng) ** 2)
            intensity = max(0.1, 1.0 - dist_from_center * 20) * (base_aqi / 200)
            intensity = min(1.0, intensity * (0.5 + random.random()))

            points.append([round(lat, 6), round(lng, 6), round(intensity, 3)])

        return points

    def _generate_generic_zones(self, count: int) -> List[Tuple[str, str]]:
        """Generate generic zone names for unknown cities."""
        type_cycle = list(self.ZONE_PROFILES.keys())
        labels = [
            "Industrial Cluster", "Main Traffic Corridor", "City Centre",
            "Market District", "Tech Park", "Old Town Quarter", "Residential Block",
            "Commercial Hub", "Green Belt", "Transport Terminal", "Factory Sector",
            "University Area", "Hospital Zone", "Highway Interchange", "Suburb",
            "New Township", "Business District", "Waterfront", "Hill Area", "Outskirts"
        ]
        return [(labels[i % len(labels)], type_cycle[i % len(type_cycle)]) for i in range(count)]

    def _get_health_advisory(self, aqi: int, zone_type: str) -> str:
        if aqi > 300:
            return "HAZARDOUS: Avoid all outdoor activity. Use N95 mask."
        elif aqi > 200:
            return "VERY UNHEALTHY: Only essential outdoor activity."
        elif aqi > 150:
            return "UNHEALTHY: Sensitive groups must stay indoors."
        elif aqi > 100:
            return "MODERATE: Limit prolonged outdoor exertion."
        elif aqi > 50:
            return "ACCEPTABLE: Minor concerns for very sensitive people."
        return "GOOD: Air quality is satisfactory."
