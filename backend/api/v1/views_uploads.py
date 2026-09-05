"""Product image upload endpoint. Owner-only, multipart, validated and re-encoded to WebP."""
import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from core.errors import taxonomy as err

from .permissions import IsOwner, TenantMixin

MAX_SIZE = 10 * 1024 * 1024  # 10 MB
WEBP_QUALITY = 85


def _to_webp(uploaded) -> bytes:  # type: ignore[no-untyped-def]
    img = Image.open(uploaded)
    img.load()  # force full decode — raises on corrupt/unsupported input
    rgb = img.convert("RGB")
    buf = BytesIO()
    rgb.save(buf, format="WEBP", quality=WEBP_QUALITY)
    return buf.getvalue()


class UploadViewSet(TenantMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    @action(detail=False, methods=["post"])
    def image(self, request, **kwargs):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(request)
        file = request.FILES.get("file")
        if file is None:
            raise err.validation("UPLOAD_NO_FILE", "file required", {})
        if file.size > MAX_SIZE:
            raise err.validation("UPLOAD_TOO_LARGE", "image too large (max 10MB)", {"size": file.size})

        try:
            webp = _to_webp(file)
        except (OSError, ValueError, Image.DecompressionBombError) as e:
            raise err.validation("UPLOAD_BAD_TYPE", "unsupported or corrupt image", {}) from e

        key = f"{tenant.slug}/{uuid.uuid4().hex}.webp"
        default_storage.save(key, ContentFile(webp))
        return Response({"key": key, "url": f"{settings.MEDIA_URL}{key}"}, status=201)
