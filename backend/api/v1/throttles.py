from rest_framework.throttling import SimpleRateThrottle


class PickupVerifyThrottle(SimpleRateThrottle):
    """Brute-force guard for pickup code verification (ADR §9: 3 attempts)."""

    scope = "pickup_verify"

    def get_cache_key(self, request, view):  # type: ignore[no-untyped-def]
        if getattr(view, "action", None) != "pickup_verify":
            return None
        user = getattr(request, "user", None)
        ident = f"{request.headers.get('X-Tenant-Slug', '')}:{getattr(user, 'pk', 'anon')}"
        return self.cache_format % {"scope": self.scope, "ident": ident}
