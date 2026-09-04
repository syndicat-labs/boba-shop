import uuid

from channels.layers import get_channel_layer

from core.realtime.port import RealtimePort


class ChannelsRealtime(RealtimePort):
    async def publish(self, tenant_id: uuid.UUID, channel: str, payload: dict) -> None:  # type: ignore[override]
        layer = get_channel_layer()
        if layer is None:
            return
        group = f"tenant_{tenant_id}.{channel}"
        await layer.group_send(group, {"type": "realtime.event", "payload": payload})

    async def subscribe(self, tenant_id: uuid.UUID, channel: str) -> None:  # type: ignore[override]
        # Subscription is handled in consumer group_add; no-op here
        return
