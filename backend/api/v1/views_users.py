from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.users.models import User

from .permissions import IsOwner, TenantMixin
from .serializers import StaffInviteSerializer


class StaffViewSet(TenantMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def list(self, request, **kwargs):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(request)
        users = User.objects.filter(tenant=tenant)
        data = [
            {"id": str(u.id), "email": u.email, "role": u.role, "is_active": u.is_active}
            for u in users
        ]
        return Response(data)

    @action(detail=False, methods=["post"])
    def invite(self, request, **kwargs):  # type: ignore[no-untyped-def]
        tenant = self.get_tenant(request)
        ser = StaffInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"]
        role = ser.validated_data["role"]
        user, created = User.objects.get_or_create(
            tenant=tenant, email=email, defaults={"role": role, "is_active": True}
        )
        return Response(
            {"id": str(user.id), "email": user.email, "role": user.role, "created": created},
            status=201 if created else 200,
        )
