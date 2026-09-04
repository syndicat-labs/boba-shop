from dataclasses import dataclass
from datetime import datetime
import uuid
from enum import Enum


class CtaType(str, Enum):
    SKU = "sku"
    URL = "url"
    ANCHOR = "anchor"


@dataclass(frozen=True)
class Banner:
    id: uuid.UUID
    tenant_id: uuid.UUID
    kicker: str  # e.g. "House · Batch at :00"
    title: str  # 120 chars max, e.g. "Brown Sugar — brewed Taichung way"
    cta_label: str  # "View →"
    cta_type: CtaType
    cta_value: str  # sku id or url
    sort: int  # 1..3
    is_active: bool
    starts_at: datetime
    ends_at: datetime | None
    media_url: str | None = None
