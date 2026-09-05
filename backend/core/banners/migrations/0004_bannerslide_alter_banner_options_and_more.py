import uuid
from datetime import UTC, datetime

import django.db.models.deletion
from django.db import migrations, models


def fold_into_single_carousel(apps, schema_editor):  # type: ignore[no-untyped-def]
    """Fold every legacy banner row into one container Banner + BannerSlide rows.

    The old model stored each promo as its own Banner row (with unique sort).
    The new model is one Banner (carousel container) per tenant whose content
    lives in BannerSlide rows. Existing rows are preserved as slides under a
    single new container; the legacy rows are then removed (content already
    folded, no information loss).
    """
    Banner = apps.get_model("banners", "Banner")
    BannerSlide = apps.get_model("banners", "BannerSlide")
    tenant_model = apps.get_model("tenants", "Tenant")

    for tenant in tenant_model.objects.all().iterator():
        rows = list(Banner.objects.filter(tenant=tenant).order_by("created_at", "sort"))
        if not rows:
            continue
        now = datetime.now(UTC)
        container = Banner.objects.create(
            tenant=tenant,
            is_active=any(r.is_active for r in rows),
            starts_at=min((r.starts_at for r in rows if r.starts_at), default=now),
            ends_at=max((r.ends_at for r in rows if r.ends_at), default=None),
        )
        for r in rows:
            BannerSlide.objects.create(
                banner=container,
                image_url=r.media_url,
                kicker=r.kicker,
                title=r.title,
                announcement="",
                cta_label=r.cta_label,
                cta_type=r.cta_type,
                cta_value=r.cta_value,
                position=r.sort,
                is_active=r.is_active,
            )
        Banner.objects.filter(tenant=tenant).exclude(id=container.id).delete()


class Migration(migrations.Migration):

    # RunPython writes rows into banner_slides referencing banners, then this
    # migration drops legacy banners columns; under one transaction Postgres
    # refuses the ALTER with "pending trigger events". Run each op in its own
    # transaction so the FK insert commits before the columns are dropped.
    atomic = False

    dependencies = [
        ('banners', '0003_alter_banner_media_url'),
    ]

    operations = [
        migrations.CreateModel(
            name='BannerSlide',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('image_url', models.CharField(blank=True, max_length=512, null=True)),
                ('kicker', models.CharField(max_length=40)),
                ('title', models.CharField(max_length=120)),
                ('announcement', models.TextField(blank=True, max_length=280)),
                ('cta_label', models.CharField(default='View →', max_length=20)),
                ('cta_type', models.CharField(choices=[('sku', 'SKU'), ('url', 'URL'), ('anchor', 'Anchor')], default='anchor', max_length=10)),
                ('cta_value', models.CharField(default='brown-sugar', max_length=256)),
                ('position', models.PositiveSmallIntegerField(default=1)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('banner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='slides', to='banners.banner')),
            ],
            options={
                'db_table': 'banner_slides',
                'ordering': ['position', 'created_at'],
                'indexes': [models.Index(fields=['banner', 'is_active'], name='banner_slid_banner__b2d5c3_idx')],
            },
        ),
        migrations.AlterModelOptions(
            name='banner',
            options={'ordering': ['created_at']},
        ),
        migrations.RemoveConstraint(
            model_name='banner',
            name='uniq_tenant_sort_active',
        ),
        migrations.RemoveIndex(
            model_name='banner',
            name='banners_tenant__9aae85_idx',
        ),
        migrations.RunPython(fold_into_single_carousel, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='banner',
            name='cta_label',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='cta_type',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='cta_value',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='kicker',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='media_url',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='sort',
        ),
        migrations.RemoveField(
            model_name='banner',
            name='title',
        ),
    ]