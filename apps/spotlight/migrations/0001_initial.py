from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='SpotlightSlide',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, max_length=150, help_text='Internal label for staff reference')),
                ('media_type', models.CharField(choices=[('video', 'Video'), ('image', 'Image')], default='video', max_length=10)),
                ('video_file', models.FileField(blank=True, null=True, upload_to='spotlight/videos/')),
                ('video_url', models.URLField(blank=True, help_text='External video URL (mp4, webm…)')),
                ('image_file', models.ImageField(blank=True, null=True, upload_to='spotlight/images/')),
                ('image_url', models.URLField(blank=True, help_text='External image URL fallback')),
                ('href', models.URLField(blank=True, help_text='Click-through URL (leave blank for no link)')),
                ('pill_label', models.CharField(blank=True, default='MATCH DAY · ROCKET LEAGUE', max_length=100)),
                ('duration', models.PositiveSmallIntegerField(default=8, help_text='Seconds to display this slide in the carousel')),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', 'created_at'],
            },
        ),
    ]
