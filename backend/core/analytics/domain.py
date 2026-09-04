"""Analytics domain — pure aggregation. No Django imports (hexagonal core)."""
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class OrderRow:
    status: str
    total: Decimal
    items: tuple[dict[str, object], ...]
    created_at: datetime


@dataclass(frozen=True)
class Summary:
    revenue: Decimal
    order_count: int
    avg_order_value: Decimal
    completed_count: int
    cancelled_count: int
    pickup_completed: int
    top_skus: tuple[tuple[str, int], ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "revenue": str(self.revenue),
            "order_count": self.order_count,
            "avg_order_value": str(self.avg_order_value),
            "completed_count": self.completed_count,
            "cancelled_count": self.cancelled_count,
            "pickup_completed": self.pickup_completed,
            "top_skus": [{"sku": s, "qty": q} for s, q in self.top_skus],
        }


def summarize(rows: list[OrderRow]) -> Summary:
    revenue = Decimal(0)
    completed = 0
    cancelled = 0
    pickup_completed = 0
    sku_qty: dict[str, int] = {}
    for r in rows:
        if r.status == "COMPLETED":
            revenue += r.total
            completed += 1
        if r.status == "CANCELLED":
            cancelled += 1
        if r.status == "AWAITING_PICKUP":
            pickup_completed += 1
        for item in r.items:
            sku = str(item.get("sku", "unknown"))
            raw_qty = item.get("qty", 0)
            qty = int(raw_qty) if isinstance(raw_qty, (int, float)) else 0
            sku_qty[sku] = sku_qty.get(sku, 0) + qty

    order_count = len(rows)
    avg = revenue / completed if completed else Decimal(0)
    top = tuple(sorted(sku_qty.items(), key=lambda kv: kv[1], reverse=True)[:5])
    return Summary(
        revenue=revenue,
        order_count=order_count,
        avg_order_value=avg.quantize(Decimal("0.01")),
        completed_count=completed,
        cancelled_count=cancelled,
        pickup_completed=pickup_completed,
        top_skus=top,
    )
