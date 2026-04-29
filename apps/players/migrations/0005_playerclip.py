import django.db.models.deletion
from cloudinary_storage.storage import VideoMediaCloudinaryStorage
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add PlayerClip model — replaces the old clips JSONField on Player.
    Each clip is a Cloudinary-hosted video file.
    """

    dependencies = [
        ('players', '0004_remove_nationality'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlayerClip',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('video_file', models.FileField(
                    upload_to='players/clips/',
                    storage=VideoMediaCloudinaryStorage(),
                    help_text='Uploaded highlight video (mp4, webm…)',
                )),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('player', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='clip_set',
                    to='players.player',
                )),
            ],
            options={
                'ordering': ['display_order', 'created_at'],
            },
        ),
    ]
