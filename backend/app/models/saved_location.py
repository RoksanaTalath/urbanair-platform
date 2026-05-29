"""
UrbanAir — Saved Location Model
MongoDB document model for user-saved locations and favorites
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class SavedLocationInDB(BaseModel):
    """A location saved/favorited by a user"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    name: str
    display_name: Optional[str] = None
    lat: float
    lng: float
    is_favorite: bool = False
    last_aqi: Optional[int] = None
    last_checked: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class SavedLocationCreate(BaseModel):
    name: str
    display_name: Optional[str] = None
    lat: float
    lng: float
    is_favorite: bool = False
    notes: Optional[str] = None


class SavedLocationResponse(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    is_favorite: bool
    last_aqi: Optional[int] = None
    created_at: datetime
