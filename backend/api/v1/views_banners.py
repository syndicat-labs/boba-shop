from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, viewsets

from core.banners.models import Banner, BannerEvent
from core.errors import taxonomy as err

from .permissions import IsOwner, TenantMixin
from .serializers import BannerSerializer


class BannerViewSet(TenantMixin, viewsets.ModelViewSet):
    """One carousel container per tenant; slides are nested in the serializer."""

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
            qs = qs.filter(is_active=True, starts_at__lte=now).filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        return qs.order_by("created_at")

    def perform_create(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        if Banner.objects.filter(tenant=tenant).exists():
            raise err.validation(
                "BANNER_EXISTS",
                "tenant already has a carousel — update it instead of creating another",
                {},
            )
        banner = serializer.save(
            tenant=tenant,
            created_by=self.request.user if self.request.user.is_authenticated else None,
        )
        BannerEvent.objects.create(
            tenant=tenant, banner=banner, from_active=False, to_active=banner.is_active, actor=self.request.user if self.request.user.is_authenticated else None
        )

    def perform_update(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        before = serializer.instance.is_active
        banner = serializer.save()
        if before != banner.is_active:
            BannerEvent.objects.create(tenant=tenant, banner=banner, from_active=before, to_active=banner.is_active, actor=self.request.user)