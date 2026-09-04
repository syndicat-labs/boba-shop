from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_banners import BannerViewSet

router = DefaultRouter()
router.register(r"tenants/(?P<tid>[^/.]+)/banners", BannerViewSet, basename="banner")

urlpatterns = [
    path("", include(router.urls)),
]
