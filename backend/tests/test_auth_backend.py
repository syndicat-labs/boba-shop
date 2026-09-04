import pytest
from django.test import RequestFactory

from core.users.backends import TenantBackend
from core.users.models import User


@pytest.fixture
def tenant_a(db):
    from core.tenants.models import Tenant

    return Tenant.objects.create(slug="tenant-a", name="A")


@pytest.fixture
def tenant_b(db):
    from core.tenants.models import Tenant

    return Tenant.objects.create(slug="tenant-b", name="B")


@pytest.fixture
def user_a(tenant_a, db):
    return User.objects.create_user(email="owner@a.com", tenant=tenant_a, password="secret123")


@pytest.fixture
def user_b(tenant_b, db):
    # same email, different tenant — tenant-scoped uniqueness
    return User.objects.create_user(email="owner@a.com", tenant=tenant_b, password="secret456")


def _req(tenant_slug: str | None = None):  # type: ignore[no-untyped-def]
    rf = RequestFactory()
    request = rf.post("/login/")
    if tenant_slug:
        request.META["HTTP_X_TENANT_SLUG"] = tenant_slug
    return request


@pytest.mark.django_db
def test_authenticate_correct_credentials(user_a):
    backend = TenantBackend()
    user = backend.authenticate(_req("tenant-a"), email="owner@a.com", password="secret123")
    assert user is not None
    assert user.email == "owner@a.com"


@pytest.mark.django_db
def test_authenticate_wrong_password(user_a):
    backend = TenantBackend()
    assert backend.authenticate(_req("tenant-a"), email="owner@a.com", password="wrong") is None


@pytest.mark.django_db
def test_authenticate_wrong_tenant_is_rejected(user_a, user_b):
    # same email exists in both tenants; only tenant-a password matches tenant-a user
    backend = TenantBackend()
    user = backend.authenticate(_req("tenant-a"), email="owner@a.com", password="secret456")
    assert user is None


@pytest.mark.django_db
def test_authenticate_missing_tenant_scopes_ambiguity(user_a, user_b):
    # no X-Tenant-Slug header → ambiguous email → refuse (zero-trust)
    backend = TenantBackend()
    assert backend.authenticate(_req(), email="owner@a.com", password="secret123") is None


@pytest.mark.django_db
def test_get_user_returns_none_for_missing(user_a):
    backend = TenantBackend()
    assert backend.get_user(user_a.pk) is not None
    assert backend.get_user("00000000-0000-0000-0000-000000000000") is None
