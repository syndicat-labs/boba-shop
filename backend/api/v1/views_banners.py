import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone
from rest_framework import permissions, viewsets

from core.banners.models import Banner, BannerEvent
from core.errors import taxonomy as err

from .permissions import IsOwner, TenantMixin
from .serializers import BannerSerializer

logger = logging.getLogger(__name__)


def _assert_sort_free(tenant, sort, is_active, exclude_id=None):  # type: ignore[no-untyped-def]
    if not is_active:
        return
    qs = Banner.objects.filter(tenant=tenant, sort=sort, is_active=True)
    if exclude_id is not None:
        qs = qs.exclude(id=exclude_id)
    if qs.exists():
        raise err.validation(
            "BANNER_SORT_TAKEN",
            "an active banner already uses this position",
            {"sort": sort},
        )


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
        sort = serializer.validated_data.get("sort", 1)
        is_active = serializer.validated_data.get("is_active", True)
        _assert_sort_free(tenant, sort, is_active)
        banner = serializer.save(tenant=tenant, created_by=self.request.user if self.request.user.is_authenticated else None)
        BannerEvent.objects.create(tenant=tenant, banner=banner, from_active=False, to_active=banner.is_active, actor=self.request.user if self.request.user.is_authenticated else None)
        self._publish(tenant, banner)

    def perform_update(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        before = serializer.instance.is_active
        instance = serializer.instance
        sort = serializer.validated_data.get("sort", instance.sort)
        is_active = serializer.validated_data.get("is_active", instance.is_active)
        _assert_sort_free(tenant, sort, is_active, exclude_id=instance.id)
        banner = serializer.save()
        BannerEvent.objects.create(tenant=tenant, banner=banner, from_active=before, to_active=banner.is_active, actor=self.request.user)
        self._publish(tenant, banner)

    def _publish(self, tenant, banner):  # type: ignore[no-untyped-def]
        try:
            layer = get_channel_layer()
            if layer:
                async_to_sync(layer.group_send)(
                    f"tenant_{tenant.id}.banners",
                    {"type": "realtime.event", "payload": BannerSerializer(banner).data},
                )
        except Exception:
            logger.warning("banner publish failed", exc_info=True)


def models_Q_ends():  # type: ignore[no-untyped-def]
    from django.db.models import Q

    return Q(ends_at__isnull=True) | Q(ends_at__gt=timezone.now())
