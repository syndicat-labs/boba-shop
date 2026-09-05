"""Ordering: publish channel helper shared by staff and customer flows."""
import logging
import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def publish_order(payload: dict, tenant_id: uuid.UUID, order_id: uuid.UUID) -> None:
    try:
        layer = get_channel_layer()
        if layer:
            message: dict = {"type": "realtime.event", "payload": payload}
            async_to_sync(layer.group_send)(f"tenant_{tenant_id}.orders", message)
            async_to_sync(layer.group_send)(f"tenant_{tenant_id}.orders.{order_id}", message)
    except Exception:
        logger.warning("order publish failed", exc_info=True)