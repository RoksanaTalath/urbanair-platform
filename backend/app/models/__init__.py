"""UrbanAir Models Package"""
from .user import UserInDB, UserCreate, UserLogin, UserResponse
from .aqi_reading import AQIReadingInDB, AQIReadingCreate, AQIReadingResponse
from .saved_location import SavedLocationInDB, SavedLocationCreate, SavedLocationResponse
from .notification import NotificationInDB, NotificationCreate, NotificationResponse
from .schemas import (
    AQIResponse, MicrozoneResponse, HeatmapResponse,
    HourlyForecastResponse, WeeklyForecastResponse,
    HealthRecommendationResponse, HotspotResponse,
    RegisterRequest, LoginRequest, TokenResponse,
    LocationSearchResponse
)

__all__ = [
    "UserInDB", "UserCreate", "UserLogin", "UserResponse",
    "AQIReadingInDB", "AQIReadingCreate", "AQIReadingResponse",
    "SavedLocationInDB", "SavedLocationCreate", "SavedLocationResponse",
    "NotificationInDB", "NotificationCreate", "NotificationResponse",
    "AQIResponse", "MicrozoneResponse", "HeatmapResponse",
    "HourlyForecastResponse", "WeeklyForecastResponse",
    "HealthRecommendationResponse", "HotspotResponse",
    "RegisterRequest", "LoginRequest", "TokenResponse",
    "LocationSearchResponse",
]
