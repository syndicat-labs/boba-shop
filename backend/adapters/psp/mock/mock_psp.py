"""
Dev-only Mock PSP. Import guarded: only available when DEV_MOCK_PSP=1 and settings.PSP_ACTIVE=='mock'.
Prod image must not import this module (CI guard).
"""
import os
import uuid
import time
from core.payments.port import PaymentIntent, WebhookEvent, PspPort


class MockPsp(PspPort):
    id = "mock"

    def create_payment(self, tenant_id: uuid.UUID, order_id: uuid.UUID, amount: float, currency: str) -> PaymentIntent:  # type: ignore[override]
        # Simulate 400ms latency, no external call
        time.sleep(0.4)
        return PaymentIntent(
            payment_id=uuid.uuid7(),  # type: ignore[attr-defined]
            order_id=order_id,
            amount=amount,
            currency=currency,
            psp=self.id,
            client_secret=f"mock_{order_id}",
        )

    def verify_webhook(self, raw: bytes, signature: str) -> WebhookEvent | None:  # type: ignore[override]
        # Dev HMAC: signature == "mock-sig" passes. In prod this endpoint 404s.
        if signature != "mock-sig":
            return None
        # raw is b'{"order_id": "...", "success": true, "psp_tx_id": "..."}' — parse minimal
        import json

        try:
            data = json.loads(raw)
            return WebhookEvent(
                psp_tx_id=data["psp_tx_id"],
                order_id=uuid.UUID(data["order_id"]),
                success=bool(data["success"]),
                raw=raw,
            )
        except Exception:
            return None


def get_mock_psp() -> MockPsp:
    if os.getenv("DEV_MOCK_PSP") != "1":
        raise RuntimeError("MockPsp only available with DEV_MOCK_PSP=1")
    return MockPsp()
