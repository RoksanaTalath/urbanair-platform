"""
UrbanAir — Authentication API
JWT-based auth. Works with or without MongoDB.
If MongoDB is unavailable, returns mock tokens for development.
"""
import re
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

import jwt
import bcrypt
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config.settings import settings
from app.config.database import get_collection, is_connected

logger = logging.getLogger("urbanair.auth")
router = APIRouter()
security = HTTPBearer(auto_error=False)


# ── Pydantic Schemas ──────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Password Helpers ──────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT Helpers ───────────────────────────────────────────────
def create_token(user_id: str, email: str, name: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please login again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    return decode_token(credentials.credentials)


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Optional auth — returns None if not authenticated."""
    if not credentials:
        return None
    try:
        return decode_token(credentials.credentials)
    except HTTPException:
        return None


# ── Routes ────────────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Register a new UrbanAir user account."""
    # Validate inputs
    name = body.name.strip()
    email = body.email.lower().strip()

    if len(name) < 2 or len(name) > 50:
        raise HTTPException(400, "Name must be 2–50 characters")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    user_id = str(uuid.uuid4())

    # Try MongoDB if available
    if is_connected():
        users = get_collection("users")
        if users is not None:
            existing = await users.find_one({"email": email})
            if existing:
                raise HTTPException(409, "Email already registered")

            user_doc = {
                "_id": user_id,
                "name": name,
                "email": email,
                "password_hash": hash_password(body.password),
                "created_at": datetime.utcnow(),
                "last_login": datetime.utcnow(),
                "is_active": True,
                "saved_locations": [],
                "favorite_cities": ["Hyderabad", "Bangalore"],
                "notification_enabled": True,
                "aqi_alert_threshold": 150,
            }
            await users.insert_one(user_doc)
            logger.info(f"New user registered: {email}")

    # Always return token (works with or without DB)
    token = create_token(user_id, email, name)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "created_at": datetime.utcnow().isoformat(),
        },
        "message": "Registration successful! Welcome to UrbanAir.",
    }


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate user and return JWT token."""
    email = body.email.lower().strip()

    if is_connected():
        users = get_collection("users")
        if users is not None:
            user = await users.find_one({"email": email})
            if not user or not verify_password(body.password, user["password_hash"]):
                raise HTTPException(401, "Invalid email or password")

            # Update last login
            await users.update_one(
                {"_id": user["_id"]},
                {"$set": {"last_login": datetime.utcnow()}}
            )

            token = create_token(str(user["_id"]), user["email"], user["name"])
            return {
                "access_token": token,
                "token_type": "bearer",
                "user": {
                    "id": str(user["_id"]),
                    "name": user["name"],
                    "email": user["email"],
                    "favorite_cities": user.get("favorite_cities", []),
                },
            }

    # Dev mode: accept any credentials if DB is down
    logger.warning(f"Login in dev mode (no DB): {email}")
    user_id = str(uuid.uuid4())
    token = create_token(user_id, email, "Dev User")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": "Dev User", "email": email},
        "note": "Running in dev mode — database not connected",
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    if is_connected():
        users = get_collection("users")
        if users is not None:
            user = await users.find_one({"email": current_user["email"]})
            if user:
                user.pop("password_hash", None)
                user["id"] = str(user.pop("_id", ""))
                return {"user": user, "authenticated": True}

    return {
        "user": {
            "id": current_user.get("sub"),
            "email": current_user.get("email"),
            "name": current_user.get("name"),
        },
        "authenticated": True,
    }


@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh JWT token (extends expiry)."""
    new_token = create_token(
        current_user["sub"],
        current_user["email"],
        current_user.get("name", ""),
    )
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (client should discard the token)."""
    return {"message": "Logged out successfully. Please discard your token."}
