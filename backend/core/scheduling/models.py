import uuid

from django.db import models


class BatchSlot(models.Model):
    """A scheduled brewing batch for a SKU, e.g. 'House · Batch at :00'."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="batch_slots")
    sku = models.CharField(max_length=64)
    slot_time = models.TimeField()
    capacity = models.PositiveIntegerField(default=20)
    booked = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "batch_slots"
        ordering = ["slot_time"]
        indexes = [models.Index(fields=["tenant", "is_active"])]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "sku", "slot_time"], name="uniq_tenant_sku_slot")
        ]

    def __str__(self) -> str:
        return f"{self.sku} @ {self.slot_time}"


class OpeningHours(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="opening_hours")
    day_of_week = models.PositiveSmallIntegerField()  # 0=Mon .. 6=Sun
    opens = models.TimeField()
    closes = models.TimeField()
    is_closed = models.BooleanField(default=False)

    class Meta:
        db_table = "opening_hours"
        ordering = ["day_of_week"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "day_of_week"], name="uniq_tenant_dow")
        ]

    def __str__(self) -> str:
        return f"{self.day_of_week}: {self.opens}-{self.closes}"
