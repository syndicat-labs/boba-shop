import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.urls import path


class _GroupConsumer(AsyncWebsocketConsumer):  # type: ignore[misc]  # channels ships no stubs
    group_prefix: str = ""

    async def connect(self):  # type: ignore[no-untyped-def]
        tid = self.scope["url_route"]["kwargs"].get("tid")
        self.group = self._group_name(tid)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, _):  # type: ignore[no-untyped-def]
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def realtime_event(self, event):  # type: ignore[no-untyped-def]
        await self.send(text_data=json.dumps(event["payload"]))

    def _group_name(self, tid) -> str:  # type: ignore[no-untyped-def]
        raise NotImplementedError


class OrderConsumer(_GroupConsumer):
    def _group_name(self, tid) -> str:  # type: ignore[no-untyped-def]
        oid = self.scope["url_route"]["kwargs"].get("oid")
        return f"tenant_{tid}.orders.{oid}"


class OrderQueueConsumer(_GroupConsumer):
    """Live order list for the admin queue — group tenant_{tid}.orders."""

    def _group_name(self, tid) -> str:  # type: ignore[no-untyped-def]
        return f"tenant_{tid}.orders"


websocket_urlpatterns = [
    path("ws/tenants/<uuid:tid>/orders", OrderQueueConsumer.as_asgi()),
    path("ws/tenants/<uuid:tid>/orders/<uuid:oid>", OrderConsumer.as_asgi()),
]
