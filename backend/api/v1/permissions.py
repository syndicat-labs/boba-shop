"""RBAC permissions + tenant resolution for the admin portal.

OWNER: full business control (catalog, banners, staff, analytics).
STAFF: operational (orders queue, pickup verify, receipt), no config.
"""
from rest_framework import permissions

from core.errors import taxonomy as err


class IsOwner(permissions.BasePermission):
    """OWNER-only. Used for config surfaces (catalog, banners, staff, analytics)."""

    def has_permission(self, request, view):  # type: ignore[no-untyped-def]
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "OWNER"
        )


class IsOwnerOrStaff(permissions.BasePermission):
    """OWNER or STAFF. Used for operational surfaces (queue, pickup, receipt)."""

    def has_permission(self, request, view):  # type: ignore[no-untyped-def]
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) in ("OWNER", "STAFF")
        )


class TenantMixin:
    """Resolve the tenant from X-Tenant-Slug header, then verify it matches the
    authenticated user's tenant (zero-trust: never trust a bare slug)."""

    def get_tenant(self, request):  # type: ignore[no-untyped-def]
        from core.tenants.models import Tenant

        slug = request.headers.get("X-Tenant-Slug") or request.query_params.get("tenant")
        if not slug:
            raise err.not_found("TENANT_MISSING", "X-Tenant-Slug header required", {})

        tenant = Tenant.objects.filter(slug=slug).first()
        if tenant is None:
            raise err.not_found("TENANT_NOT_FOUND", "tenant not found", {"slug": slug})

        user = getattr(request, "user", None)
        if user and user.is_authenticated and user.tenant_id != tenant.id:
            raise err.authorization(
                "TENANT_MISMATCH", "user does not belong to tenant", {"slug": slug}
            )
        return tenant
