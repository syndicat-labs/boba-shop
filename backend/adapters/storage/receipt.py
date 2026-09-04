"""Receipt rendering adapter (Pillow + qrcode). Returns PNG bytes."""
import io

import qrcode
from PIL import Image, ImageDraw, ImageFont

from core.orders.models import Order

_WIDTH = 480
_MARGIN = 24


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default()


def render_receipt_png(order: Order) -> bytes:
    img = Image.new("RGB", (_WIDTH, 640), "white")
    d = ImageDraw.Draw(img)
    f_title = _font(28)
    f_body = _font(18)
    f_small = _font(14)

    y = _MARGIN
    d.text((_MARGIN, y), "e-town boba", font=f_title, fill="black")
    y += 48
    d.text((_MARGIN, y), f"Order {str(order.id)[:8]}", font=f_body, fill="black")
    y += 32
    for item in order.items or []:
        d.text((_MARGIN, y), f"{item.get('qty', 0)}x {item.get('name', item.get('sku', '?'))}", font=f_body, fill="black")
        y += 28
        d.text((_MARGIN, y), f"   {item.get('unit_price', 0)} {order.currency}", font=f_small, fill="black")
        y += 24
    y += 8
    d.line([(_MARGIN, y), (_WIDTH - _MARGIN, y)], fill="black", width=1)
    y += 16
    d.text((_MARGIN, y), f"Total  {order.total} {order.currency}", font=f_body, fill="black")
    y += 40

    if order.pickup_code:
        d.text((_MARGIN, y), f"Pickup code: {order.pickup_code}", font=f_body, fill="black")
        y += 40

    qr = qrcode.make(f"boba://order/{order.id}?code={order.pickup_code or ''}")
    qr = qr.convert("RGB").resize((180, 180))
    img.paste(qr, (_WIDTH - _MARGIN - 180, y - 40))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
