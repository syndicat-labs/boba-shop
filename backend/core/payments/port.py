from typing import Protocol
from dataclasses import dataclass
import uuid


@dataclass(frozen=True)
class PaymentIntent:
    payment_id: uuid.UUID
    order_id: uuid.UUID
    amount: float
    currency: str
    psp: str
    client_secret: str | None = None


@dataclass(frozen=True)
class WebhookEvent:
    psp_tx_id: str
    order_id: uuid.UUID
    success: bool
    raw: bytes


class PspPort(Protocol):
    id: str

    def create_payment(self, tenant_id: uuid.UUID, order_id: uuid.UUID, amount: float, currency: str) -> PaymentIntent: ...

    def verify_webhook(self, raw: bytes, signature: str) -> WebhookEvent | None: ...
