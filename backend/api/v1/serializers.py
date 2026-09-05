from rest_framework import serializers

from core.banners.models import Banner, BannerSlide
from core.catalog.models import Product
from core.orders.models import Order
from core.pricing.domain import Modifier


class CartItemSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=64)
    qty = serializers.IntegerField(min_value=1, max_value=99)
    modifiers = serializers.ListField(
        child=serializers.ChoiceField(choices=[m.value for m in Modifier]),
        required=False,
        default=list,
        max_length=5,
    )


class OrderCreateSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True)

    def validate_items(self, items: list[dict]) -> list[dict]:  # type: ignore[type-arg]
        if len(items) > 20:
            raise serializers.ValidationError("at most 20 distinct items per order")
        return items


class BannerSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = BannerSlide
        fields = ["id", "image_url", "kicker", "title", "announcement", "position", "is_active"]
        read_only_fields = ["id"]

    def validate_title(self, v: str) -> str:
        if len(v) > 120:
            raise serializers.ValidationError("title max 120")
        return v

    def validate_kicker(self, v: str) -> str:
        if len(v) > 40:
            raise serializers.ValidationError("kicker max 40")
        return v

    def validate_announcement(self, v: str) -> str:
        if len(v) > 280:
            raise serializers.ValidationError("announcement max 280")
        return v


class BannerSerializer(serializers.ModelSerializer):
    slides = BannerSlideSerializer(many=True, required=False)

    class Meta:
        model = Banner
        fields = ["id", "tenant", "is_active", "starts_at", "ends_at", "slides", "created_at"]
        read_only_fields = ["id", "tenant", "created_at"]

    def create(self, validated_data):  # type: ignore[no-untyped-def]
        slides_data = validated_data.pop("slides", [])
        banner = Banner.objects.create(**validated_data)
        for s in slides_data:
            BannerSlide.objects.create(banner=banner, **s)
        return banner

    def update(self, instance, validated_data):  # type: ignore[no-untyped-def]
        slides_data = validated_data.pop("slides", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if slides_data is not None:
            instance.slides.all().delete()
            for s in slides_data:
                BannerSlide.objects.create(banner=instance, **s)
        return instance


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "sku", "name", "description", "price", "image_key", "card_image_key", "sort", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_price(self, v) -> float:  # type: ignore[no-untyped-def]
        if v <= 0:
            raise serializers.ValidationError("price must be positive")
        return v

    def validate_name(self, v: str) -> str:
        if len(v) > 120:
            raise serializers.ValidationError("name max 120")
        return v


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "tenant", "status", "items", "subtotal", "total", "currency", "pickup_code", "pickup_expires_at", "receipt_s3_key", "created_at", "completed_at"]
        read_only_fields = ["id", "tenant", "status", "items", "subtotal", "total", "currency", "pickup_code", "pickup_expires_at", "receipt_s3_key", "created_at", "completed_at"]


class StaffInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["STAFF", "OWNER"])

    def validate_role(self, v: str) -> str:
        if v == "OWNER":
            raise serializers.ValidationError("only STAFF may be invited via this endpoint")
        return v
