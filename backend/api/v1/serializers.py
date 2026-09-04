from rest_framework import serializers
from core.banners.models import Banner


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
