from rest_framework import permissions, viewsets

from core.catalog.models import Product, ProductEvent

from .permissions import IsOwner, TenantMixin
from .serializers import ProductSerializer


class ProductViewSet(TenantMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_permissions(self):  # type: ignore[no-untyped-def]
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsOwner()]

    def get_queryset(self):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        qs = Product.objects.filter(tenant=tenant)
        if self.action == "list" and self.request.query_params.get("active") == "1":
            qs = qs.filter(is_active=True)
        return qs.order_by("sort", "name")

    def perform_create(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        product = serializer.save(tenant=tenant)
        ProductEvent.objects.create(
            tenant=tenant, product=product, field="created", actor=self.request.user
        )

    def perform_update(self, serializer):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        serializer.save()
        ProductEvent.objects.create(
            tenant=tenant, product=serializer.instance, field="updated", actor=self.request.user
        )

    def perform_destroy(self, instance):  # type: ignore[no-untyped-def]
        # soft-delete: deactivate rather than delete (additive, reversible)
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
