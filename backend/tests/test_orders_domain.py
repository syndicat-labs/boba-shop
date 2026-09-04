import uuid
from datetime import UTC, datetime, timedelta

import pytest

from core.errors import AppError
from core.orders.domain import ALLOWED, Order, OrderStatus


def _order(status: OrderStatus = OrderStatus.SENT) -> Order:
    return Order(id=uuid.uuid4(), tenant_id=uuid.uuid4(), status=status)


def test_valid_transition():
    o = _order(OrderStatus.SENT)
    o.assert_can_transition(OrderStatus.RECEIVED)
    o.assert_can_transition(OrderStatus.CANCELLED)


def test_invalid_transition_raises():
    o = _order(OrderStatus.COMPLETED)
    with pytest.raises(AppError) as ei:
        o.assert_can_transition(OrderStatus.READY)
    assert ei.value.code == "ORDER_INVALID_TRANSITION"


def test_completed_is_terminal():
    assert ALLOWED[OrderStatus.COMPLETED] == set()
    assert ALLOWED[OrderStatus.CANCELLED] == set()


def test_generate_pickup_code_is_4_digits():
    o = _order()
    code = o.generate_pickup_code()
    assert len(code) == 4
    assert code.isdigit()
    assert o.pickup_expires_at is not None
    assert o.pickup_expires_at > datetime.now(UTC)


def test_pickup_expiry_30_minutes():
    o = _order()
    o.generate_pickup_code()
    delta = o.pickup_expires_at - datetime.now(UTC)
    assert timedelta(minutes=29) < delta <= timedelta(minutes=31)


def test_verify_pickup_wrong_status():
    o = _order(OrderStatus.READY)
    o.generate_pickup_code()
    with pytest.raises(AppError) as ei:
        o.verify_pickup_code(o.pickup_code or "")
    assert ei.value.code == "PICKUP_WRONG_STATUS"


def test_verify_pickup_mismatch():
    o = _order(OrderStatus.AWAITING_PICKUP)
    o.generate_pickup_code()
    with pytest.raises(AppError) as ei:
        o.verify_pickup_code("9999" if o.pickup_code != "9999" else "0000")
    assert ei.value.code == "PICKUP_MISMATCH"


def test_verify_pickup_expired():
    o = _order(OrderStatus.AWAITING_PICKUP)
    o.generate_pickup_code()
    o.pickup_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    with pytest.raises(AppError) as ei:
        o.verify_pickup_code(o.pickup_code or "")
    assert ei.value.code == "PICKUP_EXPIRED"


def test_verify_pickup_success():
    o = _order(OrderStatus.AWAITING_PICKUP)
    code = o.generate_pickup_code()
    assert o.verify_pickup_code(code) is True
