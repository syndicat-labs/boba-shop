import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email: str, tenant, password: str | None = None, **extra):  # type: ignore[no-untyped-def]
        if not email:
            raise ValueError("email required")
        email = self.normalize_email(email)
        user = self.model(email=email, tenant=tenant, **extra)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, tenant, password: str | None = None, **extra):  # type: ignore[no-untyped-def]
        extra.setdefault("role", User.Role.OWNER)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, tenant, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        STAFF = "STAFF", "Staff"

    id = models.UUIDField(primary_key=True, default=uuid.uuid7, editable=False)  # type: ignore[attr-defined]
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="users")
    email = models.EmailField()
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STAFF)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()  # type: ignore[assignment]

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        unique_together = [("tenant", "email")]
        ordering = ["email"]

    def __str__(self) -> str:
        return f"{self.email}@{self.tenant.slug}:{self.role}"
