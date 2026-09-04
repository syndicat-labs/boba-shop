import uuid

import pytest

from core.catalog.domain import MIN_ORDER_GHS, Product
from core.errors import AppError


def _product(price: float = 5.90) -> Product:
    return Product(
        id=uuid.uuid4(),
        tenant_id=uuid.uuid4(),
        sku="brown-sugar",
        name="Brown Sugar",
        description="",
        price=price,
        sort=1,
        is_active=True,
    )


def test_positive_price_passes():
    _product(price=5.90).assert_price_positive()


def test_non_positive_price_raises():
    with pytest.raises(AppError) as ei:
        _product(price=0).assert_price_positive()
    assert ei.value.code == "PRICE_NOT_POSITIVE"


def test_order_minimum_is_8():
    assert MIN_ORDER_GHS == 8
