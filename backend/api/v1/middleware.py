"""Lightweight tenant context middleware.

Resolves the active tenant from the X-Tenant-Slug header and attaches it to the
request object. It does NOT authorize — the per-view TenantMixin performs the
zero-trust user→tenant check. Setting request.tenant only makes cross-cutting
concerns (logging, analytics) tenant-aware.
"""
from core.tenants.models import Tenant


class TenantAwareMiddleware:
    def __init__(self, get_response):  # type: ignore[no-untyped-def]
        self.get_response = get_response

    def __call__(self, request):  # type: ignore[no-untyped-def]
        slug = request.headers.get("X-Tenant-Slug")
        request.tenant = None
        if slug:
            request.tenant = Tenant.objects.filter(slug=slug).first()
        return self.get_response(request)
