import uuid

from django.db import models


class Banner(models.Model):
    """One carousel container per tenant; content lives in BannerSlide rows."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="banners")
    is_active = models.BooleanField(default=True, db_index=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "banners"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["tenant", "is_active"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(ends_at__isnull=True) | models.Q(ends_at__gt=models.F("starts_at")), name="chk_ends_after_starts"),
        ]

    def __str__(self) -> str:
        return f"carousel ({self.tenant.slug}, active={self.is_active})"


class BannerSlide(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    banner = models.ForeignKey(Banner, on_delete=models.CASCADE, related_name="slides")
    # CharField (not URLField): holds uploaded image URLs relative to MEDIA_ROOT
    # (e.g. /media/<tenant>/<hex>.webp) which URLField's validator rejects.
    image_url = models.CharField(max_length=512, null=True, blank=True)
    kicker = models.CharField(max_length=40)
    title = models.CharField(max_length=120)
    announcement = models.TextField(max_length=280, blank=True)
    position = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "banner_slides"
        ordering = ["position", "created_at"]
        indexes = [models.Index(fields=["banner", "is_active"])]

    def __str__(self) -> str:
        return f"{self.kicker}: {self.title[:30]}"


class BannerEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="banner_events")
    banner = models.ForeignKey(Banner, on_delete=models.CASCADE, related_name="events")
    from_active = models.BooleanField()
    to_active = models.BooleanField()
    actor = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "banner_events"
        ordering = ["at"]