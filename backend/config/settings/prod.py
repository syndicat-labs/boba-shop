from .base import *  # noqa: F401,F403

DEBUG = False
# Must be set via env in prod
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]  # type: ignore[name-defined]
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")

# Guard: mock must never be active in prod
if PSP_ACTIVE == "mock":  # type: ignore[name-defined]
    raise RuntimeError("PSP_ACTIVE=mock forbidden in prod — configure real PSP")

# Ensure mock module not importable in prod (CI guard also checks)
DEV_MOCK_PSP = "0"  # type: ignore[assignment]

# HSTS etc.
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
