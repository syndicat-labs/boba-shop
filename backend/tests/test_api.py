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
def test_upload_rejects_over_10mb(api, owner):
    from api.v1.views_uploads import MAX_SIZE

    resp = _upload(api, owner, b"\x00" * (MAX_SIZE + 1), name="big.png", content_type="image/png")
    assert resp.status_code == 400
    assert resp.data["code"] == "UPLOAD_TOO_LARGE"


@pytest.mark.django_db
def test_upload_accepts_image(api, owner, tmp_path, monkeypatch):
    from django.core.files.storage import default_storage

    monkeypatch.setattr(default_storage, "location", str(tmp_path))
    monkeypatch.setattr(default_storage, "base_location", str(tmp_path))
    resp = _upload(api, owner, _png_bytes())
    assert resp.status_code == 201
    assert resp.data["url"].startswith("/media/")


@pytest.mark.django_db
def test_banner_single_container_enforced(api, owner, tenant):
    from django.utils import timezone

    from core.banners.models import Banner

    Banner.objects.create(tenant=tenant, is_active=True, starts_at=timezone.now())
    api.force_authenticate(user=owner)
    resp = api.post(
        f"/api/v1/tenants/{SLUG}/banners/",
        {"is_active": True, "starts_at": "2026-01-01T00:00:00Z"},
        format="json",
        **_headers(),
    )
    assert resp.status_code == 400
    assert resp.data["code"] == "BANNER_EXISTS"


@pytest.mark.django_db
def test_banner_patch_replaces_slides(api, owner, tenant):
    from django.utils import timezone

    from core.banners.models import Banner

    b = Banner.objects.create(tenant=tenant, is_active=True, starts_at=timezone.now())
    api.force_authenticate(user=owner)
    resp = api.post(
        f"/api/v1/tenants/{SLUG}/banners/",
        {"is_active": True, "starts_at": "2026-01-01T00:00:00Z", "slides": [{"kicker": "A", "title": "Alpha", "announcement": "note", "position": 1, "is_active": True}]},
        format="json",
        **_headers(),
    )
    assert resp.status_code == 400  # second container rejected even with slides

    resp = api.patch(
        f"/api/v1/tenants/{SLUG}/banners/{b.id}/",
        {"slides": [
            {"kicker": "A", "title": "Alpha", "announcement": "note", "position": 1, "is_active": True},
            {"image_url": "/media/x.webp", "kicker": "B", "title": "Beta", "position": 2, "is_active": True},
        ]},
        format="json",
        **_headers(),
    )
    assert resp.status_code == 200
    slides = resp.data["slides"]
    assert [s["title"] for s in slides] == ["Alpha", "Beta"]
    assert slides[1]["image_url"] == "/media/x.webp"
    assert "cta_type" not in slides[1]
    assert slides[0]["announcement"] == "note"

    # PATCH again replaces the set (no duplicates, old slides gone).
    resp = api.patch(
        f"/api/v1/tenants/{SLUG}/banners/{b.id}/",
        {"slides": [{"kicker": "C", "title": "Gamma", "position": 1, "is_active": True}]},
        format="json",
        **_headers(),
    )
    assert [s["title"] for s in resp.data["slides"]] == ["Gamma"]


@pytest.mark.django_db
def test_banner_public_list_excludes_inactive_and_slides_ordered(api, owner, tenant):
    from django.utils import timezone

    from core.banners.models import Banner, BannerSlide

    b = Banner.objects.create(tenant=tenant, is_active=True, starts_at=timezone.now())
    BannerSlide.objects.create(banner=b, kicker="A", title="Alpha", position=2, is_active=True)
    BannerSlide.objects.create(banner=b, kicker="B", title="Beta", position=1, is_active=True)
    BannerSlide.objects.create(banner=b, kicker="C", title="Ghost", position=3, is_active=False)

    resp = api.get(f"/api/v1/tenants/{SLUG}/banners/?active=1", **_headers())
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["id"] == str(b.id)
    # slides ordered by position; inactive slide kept (customer hides client-side)
    assert [s["title"] for s in resp.data[0]["slides"]] == ["Beta", "Alpha", "Ghost"]

    b.is_active = False
    b.save()
    resp = api.get(f"/api/v1/tenants/{SLUG}/banners/?active=1", **_headers())
    assert resp.data == []

