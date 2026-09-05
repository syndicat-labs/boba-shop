from rest_framework.throttling import SimpleRateThrottle


class _AnonTenantThrottle(SimpleRateThrottle):
    """Base for throttles keyed per tenant + actor (anon collapses per tenant)."""

    def _key(self, request) -> str:  # type: ignore[no-untyped-def]
        ident = f"{request.headers.get('X-Tenant-Slug', '')}:{getattr(getattr(request, 'user', None), 'pk', 'anon')}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PickupVerifyThrottle(_AnonTenantThrottle):
    """Brute-force guard for pickup code verification (ADR §9: 3 attempts)."""

    scope = "pickup_verify"

    def get_cache_key(self, request, view):  # type: ignore[no-untyped-def]
        if getattr(view, "action", None) != "pickup_verify":
            return None
        return self._key(request)


class ConfirmPickupThrottle(_AnonTenantThrottle):
    """Shares the pickup_verify budget for the anonymous customer confirm_pickup."""

    scope = "pickup_verify"

    def get_cache_key(self, request, view):  # type: ignore[no-untyped-def]
        if getattr(view, "action", None) != "confirm_pickup":
            return None
        return self._key(request)


class OrderCreateThrottle(_AnonTenantThrottle):
    """Limit anonymous order creation per tenant."""

    scope = "order_create"

    def get_cache_key(self, request, view):  # type: ignore[no-untyped-def]
        if getattr(view, "action", None) != "create":
            return None
        return self._key(request)