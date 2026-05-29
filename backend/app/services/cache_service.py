"""
UrbanAir — In-Memory Cache Service
TTL-based cache to reduce API calls and improve response times.

Cache TTLs:
  AQI data:      5 minutes
  Forecast:      15 minutes  
  Insights:      10 minutes
  Microzones:    5 minutes
"""
import time
import logging
from typing import Any, Optional

logger = logging.getLogger("urbanair.cache")

# In-memory store: {key: (value, expiry_timestamp)}
_cache: dict = {}

# Track cache stats
_stats = {"hits": 0, "misses": 0, "sets": 0}


class CacheService:
    """Simple async-compatible TTL cache."""

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache. Returns None if missing or expired."""
        if key in _cache:
            value, expiry = _cache[key]
            if time.time() < expiry:
                _stats["hits"] += 1
                return value
            else:
                # Expired — clean up
                del _cache[key]

        _stats["misses"] += 1
        return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Store value in cache with TTL in seconds."""
        try:
            _cache[key] = (value, time.time() + ttl)
            _stats["sets"] += 1
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for key '{key}': {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Remove a key from cache."""
        if key in _cache:
            del _cache[key]
            return True
        return False

    async def clear_prefix(self, prefix: str) -> int:
        """Remove all keys matching a prefix. Returns count deleted."""
        keys_to_delete = [k for k in _cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del _cache[k]
        return len(keys_to_delete)

    async def clear_all(self) -> int:
        """Clear entire cache. Returns count deleted."""
        count = len(_cache)
        _cache.clear()
        return count

    def get_stats(self) -> dict:
        """Return cache hit/miss statistics."""
        total = _stats["hits"] + _stats["misses"]
        hit_rate = round(_stats["hits"] / total * 100, 1) if total > 0 else 0
        return {
            **_stats,
            "total_requests": total,
            "hit_rate_pct": hit_rate,
            "current_size": len(_cache),
        }

    def purge_expired(self) -> int:
        """Remove all expired entries. Call periodically to free memory."""
        now = time.time()
        expired = [k for k, (_, exp) in _cache.items() if now > exp]
        for k in expired:
            del _cache[k]
        if expired:
            logger.debug(f"Purged {len(expired)} expired cache entries")
        return len(expired)


# Singleton instance used across all API modules
cache = CacheService()
