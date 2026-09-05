"""PSP webhook ingress. Signature-authenticated, not session-authenticated, so
CSRF exemption is correct here (the request is authenticated by the PSP HMAC,
not by a browser cookie + token pair)."""
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.payments import service as payment_service

from .publish import publish_order
from .serializers import OrderSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_exempt
def psp_webhook(request, psp: str):  # type: ignore[no-untyped-def]
    event = payment_service.verify_webhook(psp, request.body, request.headers.get("X-PSP-Signature", ""))
    payment = payment_service.confirm_payment(event.psp_tx_id, event.order_id, event.success)
    order = payment.order
    publish_order(OrderSerializer(order).data, order.tenant_id, order.id)
    return Response({"ok": True})