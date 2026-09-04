from . import base as _base
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOWED_ORIGINS = ["http://localhost:4200", "http://localhost:8000"]

# Dev DB via docker-compose
# Allow mock PSP only in dev
if PSP_ACTIVE == "mock" and DEV_MOCK_PSP != "1":  # type: ignore[name-defined]
    import warnings

    warnings.warn("DEV_MOCK_PSP should be 1 when PSP_ACTIVE=mock (dev)")

# In-memory channel layer fallback if Redis not ready (dev quick)
_redis_hosts = _base.CHANNEL_LAYERS["default"]["CONFIG"]["hosts"]  # type: ignore[index]
if not _redis_hosts[0][0]:
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}  # type: ignore[assignment]
