from rest_framework import viewsets, permissions
from rest_framework.response import Response
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from core.banners.models import Banner, BannerEvent
from .serializers import BannerSerializer
from core.errors.taxonomy import authorization


class IsOwner(permissions.BasePermission):
    def has_permission(self, request, view):  # type: ignore[no-untyped-def]
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "OWNER")


class TenantMixin:
    def get_tenant(self, request):  # type: ignore[no-untyped-def]
        slug = request.headers.get("X-Tenant-Slug") or request.query_params.get("tenant")
        if not slug:
            from core.tenants.models import Tenant
            # fallback to first tenant in dev
            return Tenant.objects.first()
        from core.tenants.models import Tenant

        try:
            return Tenant.objects.get(slug=slug)
        except Tenant.DoesNotExist as e:
            from core.errors.taxonomy import not_found

            raise not_found("TENANT_NOT_FOUND", "tenant not found", {"slug": slug}) from e


class BannerViewSet(TenantMixin, viewsets.ModelViewSet):
    serializer_class = BannerSerializer

    def get_permissions(self):  # type: ignore[no-untyped-def]
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsOwner()]

    def get_queryset(self):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        qs = Banner.objects.filter(tenant=tenant)
        if self.action == "list" and self.request.query_params.get("active") == "1":
            now = timezone.now()
            qs = qs.filter(is_active=True, starts_at__lte=now).filter(models_Q_ends())
        return qs.order_by("sort")

    def perform_create(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        banner = serializer.save(tenant=tenant, created_by=self.request.user if self.request.user.is_authenticated else None)
        BannerEvent.objects.create(tenant=tenant, banner=banner, from_active=False, to_active=banner.is_active, actor=self.request.user if self.request.user.is_authenticated else None)
        self._publish(tenant, banner)

    def perform_update(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        before = serializer.instance.is_active
        banner = serializer.save()
        BannerEvent.objects.create(tenant=tenant, banner=banner, from_active=before, to_active=banner.is_active, actor=self.request.user)
        self._publish(tenant, banner)

    def _publish(self, tenant, banner):  # type: ignore[no-untyped-def]
        try:
            layer = get_channel_layer()
            if layer:
                async_to_sync(layer.group_send)(
                    f"tenant_{tenant.id}:banners",
                    {"type": "realtime.event", "payload": BannerSerializer(banner).data},
                )
        except Exception:
            pass


def models_Q_ends():  # type: ignore[no-untyped-def]
    from django.db.models import Q

    return Q(ends_at__isnull=True) | Q(ends_at__gt=timezone.now())
