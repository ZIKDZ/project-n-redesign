from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Game',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=100, unique=True)),
                ('slug', models.SlugField(max_length=100, unique=True)),
                ('publisher', models.CharField(blank=True, max_length=100)),
                ('genre', models.CharField(blank=True, max_length=100)),
                ('banner', models.ImageField(blank=True, null=True, upload_to='games/banners/')),
                ('banner_url', models.URLField(blank=True)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='games/logos/')),
                ('logo_url', models.URLField(blank=True)),
                ('overlay_color', models.CharField(blank=True, max_length=40)),
                ('ranks', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', 'title'],
            },
        ),
    ]