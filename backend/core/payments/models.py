import uuid

from django.db import models


class Payment(models.Model):
    class State(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="payments")
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE, related_name="payments")
    psp = models.CharField(max_length=32)
    psp_tx_id = models.CharField(max_length=128, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="GHS")
    state = models.CharField(max_length=16, choices=State.choices, default=State.PENDING, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "state"]), models.Index(fields=["order"])]

    def __str__(self) -> str:
        return f"{self.psp_tx_id}:{self.state}"
