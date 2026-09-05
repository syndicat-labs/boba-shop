"""Public (anonymous) customer surface: tenant bootstrap for the kiosk app."""
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from core.errors import taxonomy as err
from core.tenants.models import Tenant


@method_decorator(ensure_csrf_cookie, name="dispatch")
class PublicViewSet(viewsets.ViewSet):
    """GET /tenants/{tid}/public — identity + CSRF bootstrap for the customer app.

    Returning the tenant UUID lets the client build WebSocket URLs (groups key on
    the UUID, not the slug). ensure_csrf_cookie plants the csrftoken cookie so the
    anonymous POST /orders from the kiosk is CSRF-protected without a session.
    """

    permission_classes = [permissions.AllowAny]

    def list(self, request, tid=None, **kwargs):  # type: ignore[no-untyped-def]
        if not isinstance(tid, str):
            raise err.not_found("TENANT_MISSING", "tenant slug required in path", {})
        tenant: Tenant | None = Tenant.objects.filter(slug=tid).first()
        if tenant is None:
            raise err.not_found("TENANT_NOT_FOUND", "tenant not found", {"slug": tid})
        return Response(
            {
                "tenant": {
                    "id": str(tenant.id),
                    "slug": tenant.slug,
                    "name": tenant.name,
                    "currency": "GHS",
                }
            }
        )