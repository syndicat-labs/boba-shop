"""
Dev-only mock live feed for banners. Guarded by DEV_MOCK_FEED=1.
Publishes random banner every interval to tenant_{tid}:banners.
"""
import os
import asyncio
import random
from datetime import datetime, timezone

SEED = [
    {"kicker": "House · Batch at :00", "title": "Brown Sugar — brewed Taichung way", "cta_label": "View →", "cta_type": "sku", "cta_value": "brown-sugar"},
    {"kicker": "Live · 89 ordered today", "title": "Taro — no powder, real taro", "cta_label": "Try →", "cta_type": "sku", "cta_value": "taro"},
    {"kicker": "Sponsor — Straus", "title": "Organic milk — sponsor", "cta_label": "Learn →", "cta_type": "url", "cta_value": "https://example.com"},
    {"kicker": "Announce", "title": "Batch at :40 — warm pearls", "cta_label": "View →", "cta_type": "anchor", "cta_value": "brown-sugar"},
    {"kicker": "Promo", "title": "Matcha Uji — 0% sugar", "cta_label": "Try →", "cta_type": "sku", "cta_value": "matcha"},
]


async def banner_tick(tenant_id, interval: float = 8.0) -> None:
    if os.getenv("DEV_MOCK_FEED") != "1":
        raise RuntimeError("Mock feed only with DEV_MOCK_FEED=1")
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if layer is None:
        return
    group = f"tenant_{tenant_id}:banners"
    while True:
        await asyncio.sleep(interval)
        payload = random.choice(SEED)
        payload = {**payload, "at": datetime.now(timezone.utc).isoformat(), "mock": True}
        await layer.group_send(group, {"type": "realtime.event", "payload": payload})
