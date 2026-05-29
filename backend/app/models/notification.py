"""
UrbanAir — Notification Model
MongoDB document model for AQI alerts and user notifications
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class NotificationInDB(BaseModel):
    """AQI alert or system notification for a user"""
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    title: str
    message: str
    notification_type: str = "aqi_alert"  # aqi_alert | system | forecast
    city: Optional[str] = None
    aqi_value: Optional[int] = None
    severity: str = "info"  # info | warning | danger | critical
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    notification_type: str = "aqi_alert"
    city: Optional[str] = None
    aqi_value: Optional[int] = None
    severity: str = "info"


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    severity: str
    is_read: bool
    created_at: datetime
    city: Optional[str] = None
    aqi_value: Optional[int] = None
