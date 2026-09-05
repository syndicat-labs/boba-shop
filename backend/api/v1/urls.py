from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from .views_analytics import AnalyticsViewSet
from .views_auth import AuthViewSet
from .views_banners import BannerViewSet
from .views_catalog import ProductViewSet
from .views_menu import MenuViewSet
from .views_orders import OrderViewSet
from .views_public import PublicViewSet
from .views_uploads import UploadViewSet
from .views_users import StaffViewSet
from .views_webhooks import psp_webhook

router = DefaultRouter()
router.register(r"tenants/(?P<tid>[^/.]+)/banners", BannerViewSet, basename="banner")
router.register(r"tenants/(?P<tid>[^/.]+)/products", ProductViewSet, basename="product")
router.register(r"tenants/(?P<tid>[^/.]+)/orders", OrderViewSet, basename="order")
router.register(r"tenants/(?P<tid>[^/.]+)/staff", StaffViewSet, basename="staff")
router.register(r"tenants/(?P<tid>[^/.]+)/analytics", AnalyticsViewSet, basename="analytics")
router.register(r"tenants/(?P<tid>[^/.]+)/uploads", UploadViewSet, basename="upload")
router.register(r"tenants/(?P<tid>[^/.]+)/menu", MenuViewSet, basename="menu")
router.register(r"tenants/(?P<tid>[^/.]+)/public", PublicViewSet, basename="public")
router.register(r"auth", AuthViewSet, basename="auth")

urlpatterns = [
    re_path(r"^webhooks/psp/(?P<psp>[\w-]+)/?$", psp_webhook, name="psp-webhook"),
    path("", include(router.urls)),
]
