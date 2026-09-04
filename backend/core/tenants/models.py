import uuid
from django.db import models


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid7, editable=False)  # type: ignore[attr-defined]
    slug = models.SlugField(unique=True, max_length=64)
    name = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tenants"
        ordering = ["slug"]

    def __str__(self) -> str:
        return f"{self.slug} ({self.id})"
