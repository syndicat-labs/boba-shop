import uuid
from typing import Protocol


class RealtimePort(Protocol):
    async def publish(self, tenant_id: uuid.UUID, channel: str, payload: dict[str, object]) -> None: ...

    async def subscribe(self, tenant_id: uuid.UUID, channel: str) -> None: ...
