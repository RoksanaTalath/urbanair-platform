"""
UrbanAir — AQI Reading Model
MongoDB document model for storing historical AQI readings
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class AQIReadingInDB(BaseModel):
    """AQI reading stored in MongoDB for historical analysis"""
    id: Optional[str] = Field(default=None, alias="_id")
    city: str
    lat: float
    lng: float
    aqi: int
    dominant_pollutant: Optional[str] = "pm25"
    pollutants: Dict[str, Any] = {}
    temp: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    level: Optional[str] = None
    source: str = "simulated"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class AQIReadingCreate(BaseModel):
    city: str
    lat: float
    lng: float
    aqi: int
    pollutants: Dict[str, Any] = {}
    source: str = "simulated"


class AQIReadingResponse(BaseModel):
    city: str
    aqi: int
    level: Optional[str] = None
    timestamp: datetime
    pollutants: Dict[str, Any] = {}
