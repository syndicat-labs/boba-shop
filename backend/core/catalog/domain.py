"""Catalog domain — pure business rules. No Django imports (hexagonal core)."""
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

# Minimum ORDER total (GHS), enforced at checkout — not a per-product floor.
MIN_ORDER_GHS = 8


@dataclass(frozen=True)
class Product:
    id: uuid.UUID
    tenant_id: uuid.UUID
    sku: str
    name: str
    description: str
    price: float
    sort: int
    is_active: bool
    image_key: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.fromtimestamp(0, tz=UTC))

    def assert_price_positive(self) -> None:
        from core.errors import taxonomy as err

        if self.price <= 0:
            raise err.validation(
                "PRICE_NOT_POSITIVE",
                "price must be positive",
                {"sku": self.sku, "price": self.price},
            )
