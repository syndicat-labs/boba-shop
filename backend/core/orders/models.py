import uuid

from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        SENT = "SENT", "Sent"
        RECEIVED = "RECEIVED", "Received"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        AWAITING_PICKUP = "AWAITING_PICKUP", "Awaiting pickup"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT, db_index=True)
    items = models.JSONField(default=list)  # [{sku,name,qty,unit_price,lineTotal}]
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="GHS")
    pickup_code = models.CharField(max_length=4, null=True, blank=True)
    pickup_expires_at = models.DateTimeField(null=True, blank=True)
    receipt_s3_key = models.CharField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["pickup_code"])]
        constraints = [
            models.UniqueConstraint(
                fields=["pickup_code"],
                condition=models.Q(pickup_code__isnull=False) & models.Q(status="AWAITING_PICKUP"),
                name="uniq_pickup_code_awaiting",
            )
        ]

    def __str__(self) -> str:
        return f"{self.id}:{self.status}@{self.tenant.slug}"


class OrderEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="order_events")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    actor = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_events"
        ordering = ["at"]

    def __str__(self) -> str:
        return f"{self.order_id}:{self.from_status}->{self.to_status}"
