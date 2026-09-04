import uuid

from django.db import models


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="products")
    sku = models.SlugField(max_length=64)
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=256, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_key = models.CharField(max_length=256, null=True, blank=True)
    card_image_key = models.CharField(max_length=256, null=True, blank=True)
    sort = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["sort", "name"]
        indexes = [models.Index(fields=["tenant", "is_active"]), models.Index(fields=["tenant", "sort"])]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "sku"], name="uniq_tenant_sku"),
            models.CheckConstraint(condition=models.Q(price__gt=0), name="chk_price_positive"),
        ]

    def __str__(self) -> str:
        return f"{self.sku}: {self.name} ₵{self.price}"


class ProductEvent(models.Model):
    """Append-only audit of catalog changes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="product_events")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="events")
    field = models.CharField(max_length=32)
    from_value = models.CharField(max_length=256, null=True, blank=True)
    to_value = models.CharField(max_length=256, null=True, blank=True)
    actor = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "product_events"
        ordering = ["at"]
