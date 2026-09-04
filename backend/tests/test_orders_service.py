from decimal import Decimal

import pytest

from core.errors import AppError
from core.orders import service
from core.orders.models import Order, OrderEvent
from core.tenants.models import Tenant
from core.users.models import User


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(slug="test-tenant", name="Test Tenant")


@pytest.fixture
def owner(tenant, db):
    return User.objects.create_user(email="owner@test.com", tenant=tenant, password="pw", role=User.Role.OWNER)


@pytest.fixture
def order(tenant, db):
    return Order.objects.create(tenant=tenant, subtotal=Decimal("10.00"), total=Decimal("10.00"), currency="GHS")


@pytest.mark.django_db
def test_transition_advances_status(order, owner):
    updated = service.transition(order, "RECEIVED", actor=owner)
    assert updated.status == "RECEIVED"
    assert OrderEvent.objects.filter(order=order).count() == 1


@pytest.mark.django_db
def test_transition_to_awaiting_generates_pickup_code(order, owner):
    for status in ("RECEIVED", "PROCESSING", "READY"):
        service.transition(order, status, actor=owner)
    updated = service.transition(order, "AWAITING_PICKUP", actor=owner)
    assert updated.pickup_code is not None
    assert len(updated.pickup_code) == 4
    assert updated.pickup_expires_at is not None


@pytest.mark.django_db
def test_transition_invalid_raises(order):
    with pytest.raises(AppError) as ei:
        service.transition(order, "READY", actor=None)
    assert ei.value.code == "ORDER_INVALID_TRANSITION"


@pytest.mark.django_db
def test_transition_unknown_status_raises(order):
    with pytest.raises(AppError) as ei:
        service.transition(order, "BOGUS", actor=None)
    assert ei.value.code == "ORDER_UNKNOWN_STATUS"


@pytest.mark.django_db
def test_verify_pickup_completes_order(order, owner):
    for status in ("RECEIVED", "PROCESSING", "READY", "AWAITING_PICKUP"):
        service.transition(order, status, actor=owner)
    code = order.pickup_code or ""
    assert service.verify_pickup(order, code) is True
    completed = service.transition(order, "COMPLETED", actor=owner)
    assert completed.status == "COMPLETED"


@pytest.mark.django_db
def test_verify_pickup_wrong_status(order):
    with pytest.raises(AppError) as ei:
        service.verify_pickup(order, "1234")
    assert ei.value.code == "PICKUP_WRONG_STATUS"


@pytest.mark.django_db
def test_verify_pickup_mismatch(order, owner):
    for status in ("RECEIVED", "PROCESSING", "READY", "AWAITING_PICKUP"):
        service.transition(order, status, actor=owner)
    wrong = "9999" if order.pickup_code != "9999" else "0000"
    with pytest.raises(AppError) as ei:
        service.verify_pickup(order, wrong)
    assert ei.value.code == "PICKUP_MISMATCH"
