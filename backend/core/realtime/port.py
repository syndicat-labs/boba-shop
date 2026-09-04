from typing import Protocol
import uuid


class RealtimePort(Protocol):
    async def publish(self, tenant_id: uuid.UUID, channel: str, payload: dict) -> None: ...

    async def subscribe(self, tenant_id: uuid.UUID, channel: str) -> None: ...
