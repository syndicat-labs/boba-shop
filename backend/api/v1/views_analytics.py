from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.analytics.domain import OrderRow, summarize
from core.orders.models import Order

from .permissions import IsOwner, TenantMixin


class AnalyticsViewSet(TenantMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    @action(detail=False, methods=["get"])
    def summary(self, request, **kwargs):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(request)
        days = int(request.query_params.get("days", "7"))
        since = timezone.now() - timedelta(days=days)
        orders = Order.objects.filter(tenant=tenant, created_at__gte=since)
        rows = [
            OrderRow(status=o.status, total=o.total, items=tuple(o.items or []), created_at=o.created_at)
            for o in orders
        ]
        return Response(summarize(rows).to_dict())
