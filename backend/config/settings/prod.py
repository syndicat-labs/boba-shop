import os

from .base import *

DEBUG = False
# Must be set via env in prod
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")

# Guard: mock must never be active in prod
if PSP_ACTIVE == "mock":  # type: ignore[name-defined]
    raise RuntimeError("PSP_ACTIVE=mock forbidden in prod — configure real PSP")

# Ensure mock module not importable in prod (CI guard also checks)
DEV_MOCK_PSP = "0"  # type: ignore[assignment]

# TLS termination happens at the edge (cloudflared tunnel / load balancer).
# When TRUST_PROXY=1, trust X-Forwarded-Proto so secure cookies + SSL redirect
# work behind the proxy. Leave it 0 for a bare HTTP deployment.
_TRUST_PROXY = os.getenv("TRUST_PROXY", "0") == "1"

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
if _TRUST_PROXY:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

CSRF_TRUSTED_ORIGINS = [o for o in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if o]
