"""Payment lifecycle service — bridges the PspPort adapter to the Django models.

Flow: create_payment_for_order (PENDING) → PSP webhook → confirm_payment
(SUCCESS/FAILED, idempotent on psp_tx_id), then transitions the order
SENT → RECEIVED on success (supercedes manual admin confirmation — the PSP
confirms funds, not the counter).
"""
import uuid
from decimal import Decimal

from core.errors import taxonomy as err
from core.orders.domain import OrderStatus
from core.orders.models import Order
from core.orders.service import transition as transition_order
from core.tenants.models import Tenant

from .models import Payment
from .port import PaymentIntent, PspPort, WebhookEvent


def get_active_psp() -> PspPort:
    """Resolve the configured PSP adapter. Mock is import-guarded to dev only."""
    from django.conf import settings

    psp_id = settings.PSP_ACTIVE
    if psp_id == "mock":
        from adapters.psp.mock.mock_psp import get_mock_psp

        if settings.DEV_MOCK_PSP != "1":
            raise err.external_dependency(
                "PSP_MOCK_FORBIDDEN", "mock PSP requires DEV_MOCK_PSP=1", {"psp": psp_id}
            )
        return get_mock_psp()
    raise err.external_dependency("PSP_UNSUPPORTED", "no adapter for PSP", {"psp": psp_id})


def create_payment_for_order(
    tenant: Tenant, order: Order, amount: Decimal, currency: str
) -> tuple[Payment, PaymentIntent]:
    """Open a PENDING payment for an order and return (payment, psp intent)."""
    psp = get_active_psp()
    intent = psp.create_payment(tenant.id, order.id, float(amount), currency)
    payment = Payment.objects.create(
        tenant=tenant,
        order=order,
        psp=intent.psp,
        psp_tx_id=str(intent.payment_id),
        amount=amount,
        currency=currency,
    )
    return payment, intent


def confirm_payment(psp_tx_id: str, order_id: uuid.UUID, success: bool) -> Payment:
    """Apply a verified PSP webhook to a payment. Idempotent on psp_tx_id.

    Raises NOT_FOUND/ AUTHORIZATION / VALIDATION on mismatch or re-use of a
    terminal payment. On success the owning order is transitioned SENT → RECEIVED.
    """
    payment = Payment.objects.filter(psp_tx_id=psp_tx_id).select_related("order", "tenant").first()
    if payment is None:
        raise err.not_found("PAYMENT_NOT_FOUND", "unknown PSP transaction", {"psp_tx_id": psp_tx_id})
    if str(payment.order_id) != str(order_id):
        raise err.authorization(
            "PAYMENT_ORDER_MISMATCH", "webhook order does not match payment", {}
        )

    if payment.state == Payment.State.FAILED:
        raise err.validation(
            "PAYMENT_ALREADY_FAILED", "payment is already final (failed)", {"psp_tx_id": psp_tx_id}
        )
    if payment.state == Payment.State.SUCCESS:
        return payment

    if success:
        payment.state = Payment.State.SUCCESS
        order = payment.order
        if order.status == OrderStatus.SENT.value:
            transition_order(order, OrderStatus.RECEIVED.value)
    else:
        payment.state = Payment.State.FAILED
    payment.save(update_fields=["state", "updated_at"])
    return payment


def verify_webhook(psp_id: str, raw: bytes, signature: str) -> WebhookEvent:
    from django.conf import settings

    if psp_id != settings.PSP_ACTIVE:
        raise err.not_found("PSP_UNEXPECTED", "webhook for inactive PSP", {"psp": psp_id})
    event = get_active_psp().verify_webhook(raw, signature)
    if event is None:
        raise err.authentication("PSP_SIGNATURE_INVALID", "PSP signature verification failed", {})
    return event