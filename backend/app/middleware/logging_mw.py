"""
UrbanAir — Request Logging Middleware
Logs all API requests with timing information.
"""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("urbanair.requests")

# Don't log these noisy paths
SILENT_PATHS = {"/api/health", "/", "/favicon.ico"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in SILENT_PATHS:
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000)

        level = logging.INFO if response.status_code < 400 else logging.WARNING
        logger.log(
            level,
            f"{request.method:<6} {request.url.path:<45} "
            f"→ {response.status_code} [{duration_ms}ms]"
        )
        return response
