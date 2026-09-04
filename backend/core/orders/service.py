"""Order lifecycle service — bridges the Django model to the pure domain rules."""
import secrets
from datetime import timedelta

from django.utils import timezone

from core.errors import taxonomy as err
from core.orders.domain import ALLOWED, OrderStatus
from core.orders.models import Order, OrderEvent
from core.users.models import User

PICKUP_TTL_MINUTES = 30


def transition(order: Order, to_status: str, actor: User | None = None) -> Order:
    try:
        from_status = OrderStatus(order.status)
        target = OrderStatus(to_status)
    except ValueError as e:
        raise err.validation("ORDER_UNKNOWN_STATUS", "unknown status", {"to": to_status}) from e

    if target not in ALLOWED[from_status]:
        raise err.validation(
            "ORDER_INVALID_TRANSITION",
            f"Cannot transition {from_status.value} → {target.value}",
            {"from": from_status.value, "to": target.value},
        )

    before = order.status
    order.status = target.value
    if target == OrderStatus.AWAITING_PICKUP:
        order.pickup_code = f"{secrets.randbelow(9000) + 1000:04d}"
        order.pickup_expires_at = timezone.now() + timedelta(minutes=PICKUP_TTL_MINUTES)
    if target == OrderStatus.COMPLETED:
        order.completed_at = timezone.now()
    order.save(update_fields=["status", "pickup_code", "pickup_expires_at", "completed_at", "updated_at"])
    OrderEvent.objects.create(tenant=order.tenant, order=order, from_status=before, to_status=target.value, actor=actor)
    return order


def verify_pickup(order: Order, code: str) -> bool:
    if order.status != OrderStatus.AWAITING_PICKUP.value:
        raise err.validation("PICKUP_WRONG_STATUS", "Order not awaiting pickup", {"status": order.status})
    if not order.pickup_code or not order.pickup_expires_at:
        raise err.validation("PICKUP_NO_CODE", "No pickup code generated", {})
    if timezone.now() > order.pickup_expires_at:
        raise err.validation("PICKUP_EXPIRED", "Pickup code expired", {"expires": order.pickup_expires_at.isoformat()})
    if order.pickup_code != code:
        raise err.validation("PICKUP_MISMATCH", "Pickup code mismatch", {})
    return True
