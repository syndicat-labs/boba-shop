from datetime import UTC, datetime
from decimal import Decimal

from core.analytics.domain import OrderRow, summarize


def _row(status: str, total: str, items: tuple[dict, ...]) -> OrderRow:
    return OrderRow(status=status, total=Decimal(total), items=items, created_at=datetime.now(UTC))


def test_summarize_empty():
    s = summarize([])
    assert s.revenue == Decimal(0)
    assert s.order_count == 0
    assert s.top_skus == ()


def test_summarize_revenue_only_completed():
    rows = [
        _row("COMPLETED", "5.90", ({"sku": "brown-sugar", "qty": 2},)),
        _row("CANCELLED", "5.40", ({"sku": "matcha", "qty": 1},)),
        _row("AWAITING_PICKUP", "5.20", ({"sku": "taro", "qty": 1},)),
    ]
    s = summarize(rows)
    assert s.revenue == Decimal("5.90")
    assert s.order_count == 3
    assert s.completed_count == 1
    assert s.cancelled_count == 1
    assert s.pickup_completed == 1


def test_summarize_top_skus_by_qty():
    rows = [
        _row("COMPLETED", "20", ({"sku": "a", "qty": 3}, {"sku": "b", "qty": 1})),
        _row("COMPLETED", "10", ({"sku": "a", "qty": 2},)),
    ]
    s = summarize(rows)
    assert s.top_skus[0] == ("a", 5)


def test_summarize_avg_order_value():
    rows = [_row("COMPLETED", "10.00", ()), _row("COMPLETED", "20.00", ())]
    s = summarize(rows)
    assert s.avg_order_value == Decimal("15.00")


def test_avg_excludes_non_completed_orders():
    rows = [_row("COMPLETED", "10.00", ()), _row("RECEIVED", "5.00", ())]
    s = summarize(rows)
    assert s.avg_order_value == Decimal("10.00")


def test_summarize_to_dict_serializable():
    rows = [_row("COMPLETED", "5.90", ({"sku": "x", "qty": 1},))]
    d = summarize(rows).to_dict()
    assert d["revenue"] == "5.90"
    assert d["top_skus"] == [{"sku": "x", "qty": 1}]
