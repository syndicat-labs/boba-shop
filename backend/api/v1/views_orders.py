import logging

from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.errors import taxonomy as err
from core.orders import service as order_service
from core.orders.models import Order
from core.payments import service as payment_service

from .permissions import IsOwnerOrStaff, TenantMixin
from .publish import publish_order
from .serializers import OrderCreateSerializer, OrderSerializer
from .throttles import ConfirmPickupThrottle, OrderCreateThrottle, PickupVerifyThrottle

logger = logging.getLogger(__name__)

_CUSTOMER_ACTIONS = {"create", "retrieve", "confirm_pickup", "receipt"}


class OrderViewSet(TenantMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrStaff]
    throttle_classes = [PickupVerifyThrottle, OrderCreateThrottle, ConfirmPickupThrottle]

    def get_permissions(self):  # type: ignore[no-untyped-def]
        if self.action in _CUSTOMER_ACTIONS:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(self.request)
        qs = Order.objects.filter(tenant=tenant)
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs.order_by("-created_at")

    def create(self, request, tid=None, **kwargs):  # type: ignore[no-untyped-def]
        """Anonymous customer order creation. Prices are server-derived."""
        tenant = self.get_tenant(request)
        payload = OrderCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        order = order_service.create_from_cart(tenant=tenant, items=payload.validated_data["items"])
        payment, intent = payment_service.create_payment_for_order(tenant, order, order.total, order.currency)
        self._publish(order)
        return Response(
            {
                "order": OrderSerializer(order).data,
                "payment": {
                    "id": str(payment.id),
                    "psp": intent.psp,
                    "amount": order.total,
                    "currency": order.currency,
                    "client_secret": intent.client_secret,
                    "psp_tx_id": str(intent.payment_id),
                },
            },
            status=201,
        )

    @method_decorator(ensure_csrf_cookie)
    def dispatch(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super().dispatch(*args, **kwargs)

    @action(detail=True, methods=["post"], throttle_classes=[ConfirmPickupThrottle])
    def confirm_pickup(self, request, tid=None, pk=None):  # type: ignore[no-untyped-def]
        order = self.get_object()
        code = str(request.data.get("code", ""))
        order_service.verify_pickup(order, code)
        order = order_service.transition(order, "COMPLETED")
        self._publish(order)
        return Response({"verified": True, "order": OrderSerializer(order).data})

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
        publish_order(OrderSerializer(order).data, order.tenant_id, order.id)
