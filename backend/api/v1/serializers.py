from rest_framework import serializers

from core.banners.models import Banner
from core.catalog.models import Product
from core.orders.models import Order


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ["id", "tenant", "kicker", "title", "cta_label", "cta_type", "cta_value", "media_url", "sort", "is_active", "starts_at", "ends_at", "created_at"]
        read_only_fields = ["id", "tenant", "created_at"]

    def validate_title(self, v: str) -> str:
        if len(v) > 120:
            raise serializers.ValidationError("title max 120")
        return v

    def validate_kicker(self, v: str) -> str:
        if len(v) > 40:
            raise serializers.ValidationError("kicker max 40")
        return v


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
        fields = ["id", "status", "items", "subtotal", "total", "currency", "pickup_code", "pickup_expires_at", "receipt_s3_key", "created_at", "completed_at"]
        read_only_fields = ["id", "status", "items", "subtotal", "total", "currency", "pickup_code", "pickup_expires_at", "receipt_s3_key", "created_at", "completed_at"]


class StaffInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=["STAFF", "OWNER"])

    def validate_role(self, v: str) -> str:
        if v == "OWNER":
            raise serializers.ValidationError("only STAFF may be invited via this endpoint")
        return v
