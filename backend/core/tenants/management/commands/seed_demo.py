"""Seed a demo tenant, owner, catalog, and banner for local testing."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.banners.models import Banner
from core.catalog.models import Product
from core.tenants.models import Tenant
from core.users.models import User

PRODUCTS = [
    ("brown-sugar", "Brown Sugar Boba", "Muscovado syrup · 4h pearls · Straus milk", "5.90", "brownsugar.jpeg", "brownsugarcropped.jpeg"),
    ("matcha", "Matcha Boba", "Uji ceremonial · oat milk · 0–100% sugar", "5.40", "matcha.jpeg", None),
    ("taro", "Taro Boba", "Real taro · no powder · warm pearls", "5.60", "taro.jpeg", None),
    ("coffee", "Coffee Boba", "Cold brew · milk foam · chewy pearls", "5.40", "coffee.jpeg", None),
    ("hongkong", "Hong Kong Boba", "Black tea · evaporated milk · strong brew", "5.50", "hongkong.jpeg", None),
    ("strawberry", "Strawberry Boba", "Fresh strawberry · jasmine green", "5.20", "strawberry.jpeg", None),
]

OWNER_EMAIL = "owner@etown.com"
OWNER_PASSWORD = "boba-dev-2026"


class Command(BaseCommand):
    help = "Seed demo tenant, owner, catalog, and banner for testing"

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        tenant, _ = Tenant.objects.get_or_create(slug="boba-obsidian", defaults={"name": "e-town boba"})

        owner, created = User.objects.get_or_create(
            tenant=tenant,
            email=OWNER_EMAIL,
            defaults={"role": User.Role.OWNER, "is_staff": True, "is_active": True},
        )
        if created:
            owner.set_password(OWNER_PASSWORD)
            owner.save(update_fields=["password"])

        for i, (sku, name, desc, price, img, thumb) in enumerate(PRODUCTS, start=1):
            Product.objects.get_or_create(
                tenant=tenant,
                sku=sku,
                defaults={"name": name, "description": desc, "price": Decimal(price), "image_key": img, "card_image_key": thumb, "sort": i, "is_active": True},
            )

        if not Banner.objects.filter(tenant=tenant).exists():
            Banner.objects.create(
                tenant=tenant,
                kicker="House · Batch at :00",
                title="Brown Sugar — brewed Taichung way",
                cta_label="View →",
                cta_type="sku",
                cta_value="brown-sugar",
                sort=1,
                is_active=True,
                starts_at=timezone.now(),
            )

        self._seed_orders(tenant)

        self.stdout.write(self.style.SUCCESS(f"Seeded '{tenant.slug}' — owner {OWNER_EMAIL} / {OWNER_PASSWORD}"))

    def _seed_orders(self, tenant) -> None:  # type: ignore[no-untyped-def]
        from core.orders import service as order_service
        from core.orders.models import Order

        if Order.objects.filter(tenant=tenant).exists():
            return

        def make(items, subtotal, total) -> Order:  # type: ignore[no-untyped-def]
            return Order.objects.create(
                tenant=tenant, items=items, subtotal=Decimal(subtotal), total=Decimal(total), currency="GHS"
            )

        # RECEIVED — shows in the queue with an actionable "→ PROCESSING" button
        r1 = make(
            [{"sku": "matcha", "name": "Matcha Boba", "qty": 1, "unit_price": "5.40"}],
            "5.40", "5.40",
        )
        order_service.transition(r1, "RECEIVED")

        # AWAITING_PICKUP — shows in the verify page with a 4-digit code
        r2 = make(
            [{"sku": "brown-sugar", "name": "Brown Sugar Boba", "qty": 2, "unit_price": "5.90"}],
            "11.80", "11.80",
        )
        for s in ("RECEIVED", "PROCESSING", "READY", "AWAITING_PICKUP"):
            order_service.transition(r2, s)

        # COMPLETED — feeds analytics revenue + receipt download
        r3 = make(
            [{"sku": "taro", "name": "Taro Boba", "qty": 1, "unit_price": "5.60"},
             {"sku": "strawberry", "name": "Strawberry Boba", "qty": 1, "unit_price": "5.20"}],
            "10.80", "10.80",
        )
        for s in ("RECEIVED", "PROCESSING", "READY", "AWAITING_PICKUP", "COMPLETED"):
            order_service.transition(r3, s)
