from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add clips (YouTube highlight links) and social link fields to Player.
    - clips: JSON list of {title, youtube_url, thumbnail_url?} dicts
    - twitter_url, instagram_url, twitch_url, kick_url, tiktok_url: optional social links
    """

    dependencies = [
        ('players', '0002_initial '),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='clips',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='List of highlight clips: [{title, youtube_url, description?}]',
            ),
        ),
        migrations.AddField(
            model_name='player',
            name='twitter_url',
            field=models.URLField(blank=True, default='', help_text='Player Twitter/X profile URL'),
        ),
        migrations.AddField(
            model_name='player',
            name='instagram_url',
            field=models.URLField(blank=True, default='', help_text='Player Instagram profile URL'),
        ),
        migrations.AddField(
            model_name='player',
            name='twitch_url',
            field=models.URLField(blank=True, default='', help_text='Player Twitch channel URL'),
        ),
        migrations.AddField(
            model_name='player',
            name='kick_url',
            field=models.URLField(blank=True, default='', help_text='Player Kick channel URL'),
        ),
        migrations.AddField(
            model_name='player',
            name='tiktok_url',
            field=models.URLField(blank=True, default='', help_text='Player TikTok profile URL'),
        ),
    ]
