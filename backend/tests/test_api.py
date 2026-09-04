"""API routing smoke tests — catch URL-kwarg regressions (the (?P<tid>...) prefix
passes `tid` into every view method; these assert each endpoint accepts it)."""
import pytest
from rest_framework.test import APIClient

from core.tenants.models import Tenant
from core.users.models import User

SLUG = "boba-obsidian"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def tenant(db):
    return Tenant.objects.create(slug=SLUG, name="e-town boba")


@pytest.fixture
def owner(tenant, db):
    return User.objects.create_user(email="owner@e.com", tenant=tenant, password="pw", role=User.Role.OWNER)


def _headers():
    return {"HTTP_X_TENANT_SLUG": SLUG}


@pytest.mark.django_db
def test_banners_list_ok(api, tenant):
    resp = api.get(f"/api/v1/tenants/{SLUG}/banners/", **_headers())
    assert resp.status_code == 200


@pytest.mark.django_db
def test_products_list_ok(api, tenant):
    resp = api.get(f"/api/v1/tenants/{SLUG}/products/", **_headers())
    assert resp.status_code == 200


@pytest.mark.django_db
def test_orders_list_ok(api, owner):
    api.force_authenticate(user=owner)
    resp = api.get(f"/api/v1/tenants/{SLUG}/orders/", **_headers())
    assert resp.status_code == 200


@pytest.mark.django_db
def test_staff_list_ok(api, owner):
    api.force_authenticate(user=owner)
    resp = api.get(f"/api/v1/tenants/{SLUG}/staff/", **_headers())
    assert resp.status_code == 200


@pytest.mark.django_db
def test_staff_invite_ok(api, owner):
    api.force_authenticate(user=owner)
    resp = api.post(f"/api/v1/tenants/{SLUG}/staff/invite/", {"email": "s@e.com", "role": "STAFF"}, format="json", **_headers())
    assert resp.status_code in (200, 201)


@pytest.mark.django_db
def test_analytics_summary_ok(api, owner):
    api.force_authenticate(user=owner)
    resp = api.get(f"/api/v1/tenants/{SLUG}/analytics/summary/", **_headers())
    assert resp.status_code == 200


@pytest.mark.django_db
def test_staff_cannot_access_catalog(api, tenant):
    staff = User.objects.create_user(email="staff@e.com", tenant=tenant, password="pw", role=User.Role.STAFF)
    api.force_authenticate(user=staff)
    resp = api.post(f"/api/v1/tenants/{SLUG}/products/", {"sku": "x", "name": "X", "price": "5.00", "sort": 1}, format="json", **_headers())
    assert resp.status_code == 403


@pytest.mark.django_db
def test_cross_tenant_access_denied(api, owner):
    other = Tenant.objects.create(slug="other", name="Other")
    User.objects.create_user(email="o@other.com", tenant=other, password="pw", role=User.Role.OWNER)
    api.force_authenticate(user=owner)
    resp = api.get(f"/api/v1/tenants/{SLUG}/staff/", HTTP_X_TENANT_SLUG="other")
    assert resp.status_code == 403


def _png_bytes() -> bytes:
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "white").save(buf, format="PNG")
    return buf.getvalue()


def _upload(api, owner, content, name="x.png", content_type="image/png"):
    from django.core.files.uploadedfile import SimpleUploadedFile

    api.force_authenticate(user=owner)
    f = SimpleUploadedFile(name, content, content_type=content_type)
    return api.post(f"/api/v1/tenants/{SLUG}/uploads/image/", {"file": f}, format="multipart", **_headers())


@pytest.mark.django_db
def test_upload_requires_file(api, owner):
    api.force_authenticate(user=owner)
    resp = api.post(f"/api/v1/tenants/{SLUG}/uploads/image/", {}, format="multipart", **_headers())
    assert resp.status_code == 400


@pytest.mark.django_db
def test_upload_rejects_bad_type(api, owner):
    resp = _upload(api, owner, b"not an image", name="x.txt", content_type="text/plain")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_upload_accepts_image(api, owner, tmp_path, monkeypatch):
    from django.core.files.storage import default_storage

    monkeypatch.setattr(default_storage, "location", str(tmp_path))
    monkeypatch.setattr(default_storage, "base_location", str(tmp_path))
    resp = _upload(api, owner, _png_bytes())
    assert resp.status_code == 201
    assert resp.data["url"].startswith("/media/")


@pytest.mark.django_db
def test_banner_sort_collision_returns_400(api, owner, tenant):
    from django.utils import timezone

    from core.banners.models import Banner

    Banner.objects.create(
        tenant=tenant, kicker="A", title="A", cta_label="View", sort=1, is_active=True, starts_at=timezone.now()
    )
    api.force_authenticate(user=owner)
    resp = api.post(
        f"/api/v1/tenants/{SLUG}/banners/",
        {"kicker": "B", "title": "B", "cta_label": "View", "sort": 1, "is_active": True, "starts_at": "2026-01-01T00:00:00Z"},
        format="json",
        **_headers(),
    )
    assert resp.status_code == 400
    assert resp.data["code"] == "BANNER_SORT_TAKEN"


@pytest.mark.django_db
def test_banner_create_free_sort_ok(api, owner, tenant):
    from django.utils import timezone

    from core.banners.models import Banner

    Banner.objects.create(
        tenant=tenant, kicker="A", title="A", cta_label="View", sort=1, is_active=True, starts_at=timezone.now()
    )
    api.force_authenticate(user=owner)
    resp = api.post(
        f"/api/v1/tenants/{SLUG}/banners/",
        {"kicker": "B", "title": "B", "cta_label": "View", "cta_type": "url", "cta_value": "https://youtube.com", "media_url": "https://www.youtube.com/embed/abc", "sort": 2, "is_active": True, "starts_at": "2026-01-01T00:00:00Z"},
        format="json",
        **_headers(),
    )
    assert resp.status_code == 201

