import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add roster-specific fields to Team:
    - banner_url, logo_url (media)
    - max_players (capacity)
    - igl FK to Player (in-game leader)
    - visibility (public / hidden)
    """

    dependencies = [
        ('teams', '0001_initial'),
        ('players', '0002_initial '),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='banner_url',
            field=models.URLField(blank=True, default='', help_text='Banner image URL for the roster card'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='team',
            name='logo_url',
            field=models.URLField(blank=True, default='', help_text='Logo/icon URL for the roster'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='team',
            name='max_players',
            field=models.PositiveSmallIntegerField(default=5, help_text='Maximum number of main players'),
        ),
        migrations.AddField(
            model_name='team',
            name='igl',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='igl_of_teams',
                to='players.player',
                help_text='In-Game Leader',
            ),
        ),
        migrations.AddField(
            model_name='team',
            name='visibility',
            field=models.CharField(
                max_length=10,
                choices=[('public', 'Public'), ('hidden', 'Hidden')],
                default='public',
            ),
        ),
    ]