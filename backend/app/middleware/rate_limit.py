"""
UrbanAir — Rate Limiting Middleware
Limits API calls per IP to prevent abuse.
Default: 200 requests per 60 seconds per IP.
"""
import time
import logging
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("urbanair.ratelimit")

# In-memory store: {ip: [timestamp, ...]}
_request_log: dict = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple sliding-window rate limiter.
    Skips rate limiting for health checks and docs.
    """

    EXEMPT_PATHS = {"/", "/api/health", "/api/docs", "/api/redoc", "/api/openapi.json"}

    def __init__(self, app, calls: int = 200, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Get client IP
        ip = self._get_client_ip(request)
        now = time.time()

        # Sliding window: keep only recent requests
        window = [t for t in _request_log[ip] if now - t < self.period]

        if len(window) >= self.calls:
            retry_after = int(self.period - (now - window[0])) + 1
            logger.warning(f"Rate limit exceeded for IP: {ip}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Max {self.calls} requests per {self.period} seconds",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        window.append(now)
        _request_log[ip] = window

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(self.calls - len(window))
        return response

    def _get_client_ip(self, request: Request) -> str:
        # Handle proxies (Render, Railway add X-Forwarded-For)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
