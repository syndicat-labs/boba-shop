from django.contrib.auth.backends import BaseBackend

from .models import User


class TenantBackend(BaseBackend):
    """Authenticate email+password scoped to the tenant from X-Tenant-Slug.

    Emails are tenant-scoped unique (unique_together tenant,email), so a bare
    email lookup is ambiguous. This backend resolves within the active tenant.
    """

    def authenticate(self, request, email=None, password=None, **kwargs):  # type: ignore[no-untyped-def]
        if not email or not password:
            return None
        tenant_slug = None
        if request is not None:
            tenant_slug = request.headers.get("X-Tenant-Slug")
        # Zero-trust: without a tenant scope, email is ambiguous across tenants — refuse.
        if not tenant_slug:
            return None
        user = User.objects.filter(email=email, tenant__slug=tenant_slug).first()
        if user and user.check_password(password):
            return user
        return None

    def get_user(self, user_id):  # type: ignore[no-untyped-def]
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
