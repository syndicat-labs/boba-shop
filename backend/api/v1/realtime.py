from channels.generic.websocket import AsyncWebsocketConsumer
import json


class BannerConsumer(AsyncWebsocketConsumer):
    async def connect(self):  # type: ignore[no-untyped-def]
        tid = self.scope["url_route"]["kwargs"].get("tid")
        self.group = f"tenant_{tid}:banners"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, _):  # type: ignore[no-untyped-def]
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def realtime_event(self, event):  # type: ignore[no-untyped-def]
        await self.send(text_data=json.dumps(event["payload"]))


class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):  # type: ignore[no-untyped-def]
        tid = self.scope["url_route"]["kwargs"].get("tid")
        oid = self.scope["url_route"]["kwargs"].get("oid")
        self.group = f"tenant_{tid}:orders:{oid}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, _):  # type: ignore[no-untyped-def]
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def realtime_event(self, event):  # type: ignore[no-untyped-def]
        await self.send(text_data=json.dumps(event["payload"]))


websocket_urlpatterns = [
    # type: ignore[no-redef]
    __import__("django.urls", fromlist=["path"]).path("ws/tenants/<uuid:tid>/banners", BannerConsumer.as_asgi()),
    __import__("django.urls", fromlist=["path"]).path("ws/tenants/<uuid:tid>/orders/<uuid:oid>", OrderConsumer.as_asgi()),
]
