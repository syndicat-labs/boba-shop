"""Session auth endpoints for the admin portal.

Session auth here is the dev/MVP bridge; production auth is OAuth2.1 + Passkeys
per ADR §16. login/logout are CSRF-exempt for the SPA's cross-origin dev setup
and will be replaced by the passkey flow before production.
"""
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from core.errors import taxonomy as err


@method_decorator(csrf_exempt, name="dispatch")  # PROD-FLAG[NO-API-VERSION]: replaced by passkey auth
class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=["post"])
    def login(self, request: Request) -> Response:
        data = request.data if isinstance(request.data, dict) else {}
        email = data.get("email")
        password = data.get("password")
        user = authenticate(request, email=email, password=password)
        if user is None:
            raise err.authentication("INVALID_CREDENTIALS", "invalid email or password", {})
        login(request, user)
        return Response(self._me(user))

    @action(detail=False, methods=["post"])
    def logout(self, request: Request) -> Response:
        logout(request)
        return Response({"ok": True})

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def me(self, request: Request, **kwargs) -> Response:  # type: ignore[no-untyped-def]
        user = request.user
        if not user.is_authenticated:
            return Response({"authenticated": False})
        return Response({"authenticated": True, **self._me(user)})

    def _me(self, user) -> dict[str, str]:  # type: ignore[no-untyped-def]
        return {"id": str(user.id), "email": user.email, "role": user.role, "tenant": user.tenant.slug}
