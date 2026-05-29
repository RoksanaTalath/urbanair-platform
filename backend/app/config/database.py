"""
UrbanAir — MongoDB Database Connection
Supports MongoDB Atlas (cloud) and local MongoDB.
Graceful fallback if MongoDB is unavailable — app still runs with simulation.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Global database client
_client = None
_db = None
_connected = False


async def connect_db():
    """
    Connect to MongoDB. 
    If connection fails, app continues running with in-memory simulation.
    """
    global _client, _db, _connected

    from app.config.settings import settings

    try:
        import motor.motor_asyncio
        _client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,
        )
        # Verify connection
        await _client.admin.command("ping")
        _db = _client[settings.MONGODB_DB_NAME]

        # Create indexes for performance
        await _create_indexes()

        _connected = True
        logger.info(f"✅ MongoDB connected: {settings.MONGODB_DB_NAME}")

    except Exception as e:
        _connected = False
        logger.warning(
            f"⚠️  MongoDB connection failed: {e}\n"
            f"   App will run with in-memory simulation (no persistence).\n"
            f"   To fix: check MONGODB_URL in your .env file.\n"
            f"   For local: install MongoDB or use MongoDB Atlas free tier."
        )


async def _create_indexes():
    """Create MongoDB indexes for efficient queries."""
    global _db
    if _db is None:
        return
    try:
        # AQI readings: index by city + timestamp
        await _db.aqi_readings.create_index([("city", 1), ("timestamp", -1)])
        await _db.aqi_readings.create_index([("lat", 1), ("lng", 1)])
        # Users: unique email index
        await _db.users.create_index([("email", 1)], unique=True)
        # Saved locations: by user
        await _db.saved_locations.create_index([("user_id", 1)])
        # Notifications: by user + read status
        await _db.notifications.create_index([("user_id", 1), ("is_read", 1)])
        logger.info("✅ MongoDB indexes created")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


async def close_db():
    """Close MongoDB connection gracefully."""
    global _client, _connected
    if _client:
        _client.close()
        _connected = False
        logger.info("MongoDB connection closed")


def get_database():
    """Get database instance. Returns None if not connected."""
    return _db


def is_connected() -> bool:
    """Check if MongoDB is connected."""
    return _connected


def get_collection(name: str):
    """Get a MongoDB collection by name. Returns None if not connected."""
    if _db is None:
        return None
    return _db[name]
