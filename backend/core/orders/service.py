"""Order lifecycle service — bridges the Django model to the pure domain rules."""
import secrets
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from core.catalog.domain import MIN_ORDER_GHS
from core.catalog.models import Product
from core.errors import taxonomy as err
from core.orders.domain import ALLOWED, OrderStatus
from core.orders.models import Order, OrderEvent
from core.pricing.domain import Modifier, line_total
from core.tenants.models import Tenant
from core.users.models import User

PICKUP_TTL_MINUTES = 30
MAX_CART_ITEMS = 20
MAX_ITEM_QTY = 99


def create_from_cart(*, tenant: Tenant, items: list[dict[str, object]]) -> Order:
    """Validate a customer cart server-side and open a SENT order.

    Prices always come from the catalog, never from the client payload.
    """
    if not items:
        raise err.validation("CART_EMPTY", "Cart is empty; add at least one item", {})
    if len(items) > MAX_CART_ITEMS:
        raise err.validation(
            "CART_TOO_LARGE", f"Cart may contain at most {MAX_CART_ITEMS} rows", {"limit": MAX_CART_ITEMS}
        )

    skus = [str(it["sku"]) for it in items if isinstance(it.get("sku"), str)]
    products = {p.sku: p for p in Product.objects.filter(tenant=tenant, sku__in=skus, is_active=True)}

    lines: list[dict[str, object]] = []
    total = Decimal("0.00")
    for raw in items:
        sku = raw.get("sku")
        qty = raw.get("qty")
        if not isinstance(sku, str) or not isinstance(qty, int) or not 1 <= qty <= MAX_ITEM_QTY:
            raise err.validation("ITEM_INVALID", "Each item needs sku and qty between 1 and 99", {})
        product = products.get(sku)
        if product is None:
            raise err.validation("SKU_NOT_FOUND", "Unknown or inactive product", {"sku": sku})

        modifiers: tuple[Modifier, ...] = ()
        requested = raw.get("modifiers", [])
        if requested:
            if not isinstance(requested, list) or len(requested) > 5:
                raise err.validation("MODIFIER_INVALID", "modifiers must be a short list", {"sku": sku})
            resolved: list[Modifier] = []
            for m in requested:
                try:
                    resolved.append(Modifier(str(m)))
                except ValueError as e:
                    raise err.validation(
                        "MODIFIER_UNKNOWN", "Unknown modifier", {"sku": sku, "modifier": m}
                    ) from e
            for mod in resolved:
                if resolved.count(mod) > 1:
                    raise err.validation("MODIFIER_DUPLICATE", "Duplicate modifier", {"sku": sku, "modifier": mod.value})
            modifiers = tuple(resolved)

        line = line_total(product.price, qty, modifiers)
        total += line
        lines.append(
            {
                "sku": product.sku,
                "name": product.name,
                "qty": qty,
                "unit_price": str(product.price),
                "line_total": str(line),
                "modifiers": [m.value for m in modifiers],
            }
        )

    if total < MIN_ORDER_GHS:
        raise err.validation(
            "MIN_ORDER_NOT_MET",
            f"Minimum order is ₵{MIN_ORDER_GHS}",
            {"minimum": float(MIN_ORDER_GHS), "total": float(total)},
        )

    order = Order.objects.create(
        tenant=tenant,
        status=OrderStatus.SENT.value,
        items=lines,
        subtotal=total,
        total=total,
        currency="GHS",
    )
    OrderEvent.objects.create(tenant=tenant, order=order, from_status="NEW", to_status=OrderStatus.SENT.value)
    return order


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
