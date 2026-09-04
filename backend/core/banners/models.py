import uuid

from django.db import models


class Banner(models.Model):
    class CtaType(models.TextChoices):
        SKU = "sku", "SKU"
        URL = "url", "URL"
        ANCHOR = "anchor", "Anchor"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="banners")
    kicker = models.CharField(max_length=40)
    title = models.CharField(max_length=120)
    cta_label = models.CharField(max_length=20, default="View →")
    cta_type = models.CharField(max_length=10, choices=CtaType.choices, default=CtaType.ANCHOR)
    cta_value = models.CharField(max_length=256, default="brown-sugar")
    media_url = models.URLField(null=True, blank=True)
    sort = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "banners"
        ordering = ["sort", "-created_at"]
        indexes = [models.Index(fields=["tenant", "is_active"]), models.Index(fields=["tenant", "sort"])]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "sort"], condition=models.Q(is_active=True), name="uniq_tenant_sort_active"),
            models.CheckConstraint(condition=models.Q(ends_at__isnull=True) | models.Q(ends_at__gt=models.F("starts_at")), name="chk_ends_after_starts"),
        ]

    def __str__(self) -> str:
        return f"{self.kicker}: {self.title[:30]} ({self.tenant.slug})"


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
