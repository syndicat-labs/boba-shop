"""Pricing domain — pure rules for modifiers and totals. No Django imports."""
from decimal import ROUND_HALF_UP, Decimal
from enum import Enum


class Modifier(str, Enum):
    OAT = "oat"  # +₵0.80 oat milk


MODIFIER_PRICE: dict[Modifier, Decimal] = {Modifier.OAT: Decimal("0.80")}


def line_total(unit_price: Decimal, qty: int, modifiers: tuple[Modifier, ...]) -> Decimal:
    base = unit_price * qty
    for m in modifiers:
        base += MODIFIER_PRICE[m] * qty
    return base.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def order_total(lines: list[Decimal]) -> Decimal:
    total = sum(lines, Decimal(0))
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
