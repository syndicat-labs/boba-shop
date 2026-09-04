"""Menu QR endpoint — renders a QR code for the customer menu URL (owner-only)."""
import io

import qrcode
from django.http import HttpResponse
from rest_framework import permissions, viewsets
from rest_framework.decorators import action

from core.errors import taxonomy as err

from .permissions import IsOwner, TenantMixin


class MenuViewSet(TenantMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    @action(detail=False, methods=["get"])
    def qr(self, request, **kwargs):  # type: ignore[no-untyped-def]
        url = request.query_params.get("url", "")
        if not url:
            raise err.validation("QR_URL_REQUIRED", "url required", {})
        img = qrcode.make(url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return HttpResponse(buf.getvalue(), content_type="image/png")
