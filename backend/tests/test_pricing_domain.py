from decimal import Decimal

from core.pricing.domain import MODIFIER_PRICE, Modifier, line_total, order_total


def test_line_total_no_modifiers():
    assert line_total(Decimal("5.90"), 2, ()) == Decimal("11.80")


def test_line_total_with_oat_modifier():
    # 5.90 * 2 + 0.80 * 2 = 11.80 + 1.60 = 13.40
    assert line_total(Decimal("5.90"), 2, (Modifier.OAT,)) == Decimal("13.40")


def test_oat_modifier_price_is_080():
    assert MODIFIER_PRICE[Modifier.OAT] == Decimal("0.80")


def test_order_total_sums_lines():
    assert order_total([Decimal("5.90"), Decimal("5.40"), Decimal("0.80")]) == Decimal("12.10")


def test_order_total_rounds_to_cents():
    assert order_total([Decimal("1.005"), Decimal("2.005")]) == Decimal("3.01")
