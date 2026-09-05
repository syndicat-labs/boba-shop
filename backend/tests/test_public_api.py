"""Phase 1 — anonymous customer flows: public bootstrap, order creation,
PSP webhook lifecycle, order tracking retrieval, and pickup confirmation."""
import json
import uuid
from decimal import Decimal

import pytest
from django.test import Client
from rest_framework.test import APIClient

from core.catalog.models import Product
from core.orders import service as order_service
from core.orders.models import Order, OrderEvent
from core.payments.models import Payment
from core.tenants.models import Tenant

SLUG = "boba-obsidian"


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(slug=SLUG, name="e-town boba")


@pytest.fixture
def products(tenant, db):
    return [
        Product.objects.create(
            tenant=tenant, sku="brown-sugar", name="Brown Sugar Boba", price=Decimal("5.90"), sort=1, is_active=True
        ),
        Product.objects.create(
            tenant=tenant, sku="taro", name="Taro Milk Tea", price=Decimal("6.50"), sort=2, is_active=True
        ),
    ]


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def csrf_client():
    return Client(enforce_csrf_checks=True)


@pytest.fixture
def mock_psp(monkeypatch, settings):
    monkeypatch.setenv("DEV_MOCK_PSP", "1")
    settings.DEV_MOCK_PSP = "1"
    settings.PSP_ACTIVE = "mock"


def _url(*parts: str) -> str:
    return "/api/v1/" + "/".join(parts) + "/"


def _cart(prices=(2, 2)):  # brown-sugar x2, taro x2 → 11.80 + 13.00 = 24.80
    return {
        "items": [
            {"sku": "brown-sugar", "qty": prices[0]},
            {"sku": "taro", "qty": prices[1]},
        ]
    }


def _create_order(api, body=None, **headers):  # type: ignore[no-untyped-def]
    return api.post(
        _url("tenants", SLUG, "orders"),
        data=body if body is not None else _cart(),
        format="json",
        HTTP_X_TENANT_SLUG=SLUG,
        **headers,
    )


# --------------------------------------------------------------------------- public bootstrap


@pytest.mark.django_db
def test_public_bootstrap_returns_tenant_identity(api, tenant):
    resp = api.get(_url("tenants", SLUG, "public"))
    assert resp.status_code == 200
    assert resp.data["tenant"]["slug"] == SLUG
    assert resp.data["tenant"]["currency"] == "GHS"
    assert len(resp.data["tenant"]["id"]) == 36


@pytest.mark.django_db
def test_public_bootstrap_unknown_tenant_404(api, tenant):
    resp = api.get(_url("tenants", "no-such", "public"))
    assert resp.status_code == 404
    assert resp.data["code"] == "TENANT_NOT_FOUND"


# --------------------------------------------------------------------------- anonymous order creation


@pytest.mark.django_db
def test_anonymous_create_order_opens_pending_payment(api, products, mock_psp):
    resp = _create_order(api)
    assert resp.status_code == 201
    order = Order.objects.get(id=resp.data["order"]["id"])
    assert order.status == "SENT"
    assert order.total == Decimal("24.80")
    assert order.currency == "GHS"

    payment = Payment.objects.get(order=order)
    assert payment.state == Payment.State.PENDING
    assert payment.psp == "mock"
    assert resp.data["payment"]["client_secret"] == f"mock_{order.id}"
    assert resp.data["payment"]["amount"] == order.total


@pytest.mark.django_db
def test_create_uses_server_prices_not_client_priced_items(api, products, mock_psp):
    forged = {"items": [{"sku": "brown-sugar", "qty": 2, "price": "999.00"}]}
    resp = _create_order(api, forged)
    assert resp.status_code == 201
    assert resp.data["order"]["total"] == "11.80"


@pytest.mark.django_db
def test_create_apply_oat_modifier(api, products, mock_psp):
    resp = _create_order(api, {"items": [{"sku": "brown-sugar", "qty": 2, "modifiers": ["oat"]}]})
    assert resp.status_code == 201
    assert resp.data["order"]["total"] == "13.40"
    assert resp.data["order"]["items"][0]["modifiers"] == ["oat"]


@pytest.mark.django_db
def test_create_unknown_modifier_rejected(api, products, mock_psp):
    resp = _create_order(api, {"items": [{"sku": "brown-sugar", "qty": 1, "modifiers": ["almond"]}]})
    assert resp.status_code == 400


@pytest.mark.django_db
def test_create_empty_cart_rejected(api, products, mock_psp):
    resp = _create_order(api, {"items": []})
    assert resp.status_code == 400
    assert resp.data["code"] == "CART_EMPTY"


@pytest.mark.django_db
def test_create_below_minimum_order_rejected(api, products, mock_psp):
    resp = _create_order(api, {"items": [{"sku": "brown-sugar", "qty": 1}]})
    assert resp.status_code == 400
    assert resp.data["code"] == "MIN_ORDER_NOT_MET"


@pytest.mark.django_db
def test_create_unknown_sku_rejected(api, products, mock_psp):
    resp = _create_order(api, {"items": [{"sku": "nope", "qty": 5}]})
    assert resp.status_code == 400
    assert resp.data["code"] == "SKU_NOT_FOUND"


@pytest.mark.django_db
def test_create_duplicate_sku_rows_accumulate(api, products, mock_psp):
    body = _cart()
    body["items"].append({"sku": "taro", "qty": 1})
    resp = _create_order(api, body)
    assert resp.status_code == 201
    assert resp.data["order"]["total"] == "31.30"


@pytest.mark.django_db
def test_create_disabled_product_rejected(api, products, mock_psp):
    products[0].is_active = False
    products[0].save(update_fields=["is_active"])
    resp = _create_order(api, {"items": [{"sku": "brown-sugar", "qty": 4}]})
    assert resp.status_code == 400
    assert resp.data["code"] == "SKU_NOT_FOUND"


# --------------------------------------------------------------------------- CSRF boundary (native middleware client)
# DRF views are csrf-exempt at the middleware layer; anonymous non-session POSTs
# are secured by capability + tenant scoping + throttle, not by a CSRF token.
# The bootstrap cookie still documents the intended browser flow end-to-end.


@pytest.mark.django_db
def test_bootstrap_cookie_then_anonymous_create_through_real_middleware(csrf_client, products, mock_psp):
    boot = csrf_client.get(_url("tenants", SLUG, "public"))
    assert boot.status_code == 200
    token = boot.cookies.get("csrftoken")
    assert token is not None
    resp = csrf_client.post(
        _url("tenants", SLUG, "orders"),
        data=json.dumps(_cart()),
        content_type="application/json",
        HTTP_X_TENANT_SLUG=SLUG,
        HTTP_X_CSRFTOKEN=token.value,
    )
    assert resp.status_code == 201
    assert resp.json()["order"]["status"] == "SENT"


@pytest.mark.django_db
def test_webhook_ignores_csrf_middleware(csrf_client, api, products, mock_psp):
    created = _create_order(api)
    order_id = created.data["order"]["id"]
    tx = created.data["payment"]["psp_tx_id"]
    resp = csrf_client.post(
        _url("webhooks", "psp", "mock"),
        data=json.dumps({"order_id": order_id, "psp_tx_id": tx, "success": True}),
        content_type="application/json",
        HTTP_X_PSP_SIGNATURE="mock-sig",
    )
    assert resp.status_code == 200


# --------------------------------------------------------------------------- PSP webhook lifecycle


def _webhook(api, order_id, tx, success=True, signature="mock-sig"):  # type: ignore[no-untyped-def]
    return api.post(
        _url("webhooks", "psp", "mock"),
        data={"order_id": order_id, "psp_tx_id": tx, "success": success},
        format="json",
        HTTP_X_PSP_SIGNATURE=signature,
    )


def _open_order(api, mock_psp, products):  # type: ignore[no-untyped-def]
    created = _create_order(api)
    assert created.status_code == 201
    return created.data["order"], created.data["payment"]


@pytest.mark.django_db
def test_webhook_success_confirms_payment_and_receives_order(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    resp = _webhook(api, order["id"], payment["psp_tx_id"])
    assert resp.status_code == 200
    assert resp.data["ok"] is True

    payment_obj = Payment.objects.get(id=payment["id"])
    assert payment_obj.state == Payment.State.SUCCESS
    refreshed = Order.objects.get(id=order["id"])
    assert refreshed.status == "RECEIVED"
    assert OrderEvent.objects.filter(order=refreshed, to_status="RECEIVED").count() == 1


@pytest.mark.django_db
def test_webhook_is_idempotent_on_psp_tx_id(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    assert _webhook(api, order["id"], payment["psp_tx_id"]).status_code == 200
    assert _webhook(api, order["id"], payment["psp_tx_id"]).status_code == 200
    refreshed = Order.objects.get(id=order["id"])
    assert refreshed.status == "RECEIVED"
    assert OrderEvent.objects.filter(order=refreshed, to_status="RECEIVED").count() == 1


@pytest.mark.django_db
def test_webhook_rejects_bad_signature(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    resp = _webhook(api, order["id"], payment["psp_tx_id"], signature="forged")
    assert resp.status_code == 401
    assert resp.data["code"] == "PSP_SIGNATURE_INVALID"
    assert Order.objects.get(id=order["id"]).status == "SENT"


@pytest.mark.django_db
def test_webhook_rejects_unknown_transaction(api, products, mock_psp):
    order, _ = _open_order(api, mock_psp, products)
    resp = _webhook(api, order["id"], "00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.data["code"] == "PAYMENT_NOT_FOUND"


@pytest.mark.django_db
def test_webhook_rejects_order_mismatch(api, products, mock_psp):
    _, payment = _open_order(api, mock_psp, products)
    resp = _webhook(api, str(uuid.uuid4()), payment["psp_tx_id"])
    assert resp.status_code == 403
    assert resp.data["code"] == "PAYMENT_ORDER_MISMATCH"


@pytest.mark.django_db
def test_webhook_failure_marks_payment_failed(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    resp = _webhook(api, order["id"], payment["psp_tx_id"], success=False)
    assert resp.status_code == 200
    assert Payment.objects.get(id=payment["id"]).state == Payment.State.FAILED
    assert Order.objects.get(id=order["id"]).status == "SENT"


@pytest.mark.django_db
def test_webhook_rejects_retry_after_terminal_failure(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    _webhook(api, order["id"], payment["psp_tx_id"], success=False)
    resp = _webhook(api, order["id"], payment["psp_tx_id"], success=True)
    assert resp.status_code == 400
    assert resp.data["code"] == "PAYMENT_ALREADY_FAILED"


@pytest.mark.django_db
def test_webhook_rejects_inactive_psp(api, products, mock_psp):
    order, payment = _open_order(api, mock_psp, products)
    resp = api.post(
        _url("webhooks", "psp", "stripe"),
        data={"order_id": order["id"], "psp_tx_id": payment["psp_tx_id"], "success": True},
        format="json",
        HTTP_X_PSP_SIGNATURE="mock-sig",
    )
    assert resp.status_code == 404
    assert resp.data["code"] == "PSP_UNEXPECTED"


# --------------------------------------------------------------------------- anonymous tracking + pickup


@pytest.mark.django_db
def test_anonymous_retrieve_own_order(api, products, mock_psp):
    order, _ = _open_order(api, mock_psp, products)
    resp = api.get(_url("tenants", SLUG, "orders", order["id"]), HTTP_X_TENANT_SLUG=SLUG)
    assert resp.status_code == 200
    assert resp.data["id"] == order["id"]
    assert resp.data["status"] == "SENT"


@pytest.mark.django_db
def test_anonymous_retrieve_foreign_tenant_order_404(api, tenant, products, mock_psp):
    other_tenant = Tenant.objects.create(slug="other", name="Other")
    order = Order.objects.create(tenant=other_tenant, subtotal=Decimal("9.00"), total=Decimal("9.00"))
    resp = api.get(_url("tenants", SLUG, "orders", str(order.id)), HTTP_X_TENANT_SLUG=SLUG)
    assert resp.status_code == 404


def _instrument_order_to_awaiting(api, products, mock_psp):  # type: ignore[no-untyped-def]
    order, payment = _open_order(api, mock_psp, products)
    _webhook(api, order["id"], payment["psp_tx_id"])
    obj = Order.objects.get(id=order["id"])
    for status in ("PROCESSING", "READY", "AWAITING_PICKUP"):
        obj = order_service.transition(obj, status)
    return obj


@pytest.mark.django_db
def test_anonymous_confirm_pickup_completes_order(api, products, mock_psp):
    obj = _instrument_order_to_awaiting(api, products, mock_psp)
    resp = api.post(
        _url("tenants", SLUG, "orders", str(obj.id), "confirm_pickup"),
        data={"code": obj.pickup_code},
        format="json",
        HTTP_X_TENANT_SLUG=SLUG,
    )
    assert resp.status_code == 200
    assert resp.data["order"]["status"] == "COMPLETED"
    obj.refresh_from_db()
    assert obj.status == "COMPLETED"


@pytest.mark.django_db
def test_anonymous_confirm_pickup_wrong_code_400(api, products, mock_psp):
    obj = _instrument_order_to_awaiting(api, products, mock_psp)
    code = obj.pickup_code or "0000"
    resp = api.post(
        _url("tenants", SLUG, "orders", str(obj.id), "confirm_pickup"),
        data={"code": "9999" if code != "9999" else "0000"},
        format="json",
        HTTP_X_TENANT_SLUG=SLUG,
    )
    assert resp.status_code == 400
    assert resp.data["code"] == "PICKUP_MISMATCH"


# --------------------------------------------------------------------------- anonymous receipt download


@pytest.mark.django_db
def test_anonymous_receipt_download(api, products, mock_psp):
    order, _ = _open_order(api, mock_psp, products)
    resp = api.get(_url("tenants", SLUG, "orders", order["id"], "receipt"), HTTP_X_TENANT_SLUG=SLUG)
    assert resp.status_code == 200
    assert resp["Content-Type"] == "image/png"
    assert "attachment" in resp["Content-Disposition"]


@pytest.mark.django_db
def test_anonymous_receipt_download_foreign_tenant_404(api, tenant, products, mock_psp):
    other_tenant = Tenant.objects.create(slug="other", name="Other")
    order = Order.objects.create(tenant=other_tenant, subtotal=Decimal("9.00"), total=Decimal("9.00"))
    resp = api.get(
        _url("tenants", SLUG, "orders", str(order.id), "receipt"), HTTP_X_TENANT_SLUG=SLUG
    )
    assert resp.status_code == 404


@pytest.mark.django_db
def test_customer_retrieve_hides_other_tenant_via_slug(api, tenant, products, mock_psp):
    resp = api.get(_url("tenants", SLUG, "orders", "00000000-0000-0000-0000-000000000000"), HTTP_X_TENANT_SLUG=SLUG)
    assert resp.status_code == 404