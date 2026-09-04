from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import secrets
from enum import Enum
import uuid


class OrderStatus(str, Enum):
    SENT = "SENT"
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    AWAITING_PICKUP = "AWAITING_PICKUP"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


ALLOWED: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.SENT: {OrderStatus.RECEIVED, OrderStatus.CANCELLED},
    OrderStatus.RECEIVED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.AWAITING_PICKUP},
    OrderStatus.AWAITING_PICKUP: {OrderStatus.COMPLETED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}


@dataclass
class OrderItem:
    sku: str
    name: str
    qty: int
    unit_price: float


@dataclass
class Order:
    id: uuid.UUID
    tenant_id: uuid.UUID
    status: OrderStatus
    items: list[OrderItem] = field(default_factory=list)
    subtotal: float = 0
    total: float = 0
    currency: str = "GHS"
    pickup_code: str | None = None
    pickup_expires_at: datetime | None = None
    receipt_s3_key: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def assert_can_transition(self, to: OrderStatus) -> None:
        from core.errors import taxonomy as err

        if to not in ALLOWED[self.status]:
            raise err.validation(
                "ORDER_INVALID_TRANSITION",
                f"Cannot transition {self.status} → {to}",
                {"from": self.status, "to": to},
            )

    def generate_pickup_code(self) -> str:
        code = f"{secrets.randbelow(9000)+1000:04d}"
        self.pickup_code = code
        self.pickup_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        return code

    def verify_pickup_code(self, code: str) -> bool:
        from core.errors import taxonomy as err

        if self.status != OrderStatus.AWAITING_PICKUP:
            raise err.validation("PICKUP_WRONG_STATUS", "Order not awaiting pickup", {"status": self.status})
        if not self.pickup_code or not self.pickup_expires_at:
            raise err.validation("PICKUP_NO_CODE", "No pickup code generated", {})
        if datetime.now(timezone.utc) > self.pickup_expires_at:
            raise err.validation("PICKUP_EXPIRED", "Pickup code expired", {"expires": self.pickup_expires_at.isoformat()})
        if self.pickup_code != code:
            raise err.validation("PICKUP_MISMATCH", "Pickup code mismatch", {})
        return True
