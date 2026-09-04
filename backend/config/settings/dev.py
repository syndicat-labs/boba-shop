from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
CORS_ALLOWED_ORIGINS = ["http://localhost:4200", "http://localhost:8000"]

# Dev DB via docker-compose
# Allow mock PSP only in dev
if PSP_ACTIVE == "mock" and DEV_MOCK_PSP != "1":  # type: ignore[name-defined]
    import warnings

    warnings.warn("DEV_MOCK_PSP should be 1 when PSP_ACTIVE=mock (dev)")

# In-memory channel layer fallback if Redis not ready (dev quick)
if not CHANNEL_LAYERS["default"]["CONFIG"]["hosts"][0][0]:  # type: ignore[index]
    CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}  # type: ignore[assignment]
