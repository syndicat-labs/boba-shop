import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.errors import taxonomy as err
from core.orders import service as order_service
from core.orders.models import Order

from .permissions import IsOwnerOrStaff, TenantMixin
from .serializers import OrderSerializer
from .throttles import PickupVerifyThrottle

logger = logging.getLogger(__name__)


class OrderViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrStaff]
    throttle_classes = [PickupVerifyThrottle]

    def get_queryset(self):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        qs = Order.objects.filter(tenant=tenant)
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def status(self, request, tid=None, pk=None):  # type: ignore[no-untyped-def]
        order = self.get_object()
        to = request.data.get("to")
        if not to:
            raise err.validation("ORDER_STATUS_REQUIRED", "to status required", {})
        order = order_service.transition(order, str(to), actor=request.user)
        self._publish(order)
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def pickup_verify(self, request, tid=None, pk=None):  # type: ignore[no-untyped-def]
        order = self.get_object()
        code = str(request.data.get("code", ""))
        order_service.verify_pickup(order, code)
        order = order_service.transition(order, "COMPLETED", actor=request.user)
        self._publish(order)
        return Response({"verified": True, "order": OrderSerializer(order).data})

    @action(detail=True, methods=["get"])
    def receipt(self, request, tid=None, pk=None):  # type: ignore[no-untyped-def]
        order = self.get_object()
        from adapters.storage.receipt import render_receipt_png

        png = render_receipt_png(order)
        response = HttpResponse(png, content_type="image/png")
        response["Content-Disposition"] = f'attachment; filename="receipt-{str(order.id)[:8]}.png"'
        return response

    def _publish(self, order: Order) -> None:
        try:
            layer = get_channel_layer()
            if layer:
                payload = OrderSerializer(order).data
                async_to_sync(layer.group_send)(
                    f"tenant_{order.tenant_id}.orders.{order.id}",
                    {"type": "realtime.event", "payload": payload},
                )
                async_to_sync(layer.group_send)(
                    f"tenant_{order.tenant_id}.orders",
                    {"type": "realtime.event", "payload": payload},
                )
        except Exception:
            logger.warning("order publish failed", exc_info=True)
