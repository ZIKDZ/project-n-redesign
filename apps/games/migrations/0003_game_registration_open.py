from django.db import migrations, models


class Migration(migrations.Migration):
    """Add registration_open boolean to Game.

    This field is independent of is_active:
      - is_active   → game appears in the public games showcase
      - registration_open → game appears in the landing-page join form

    Default is False so existing games do not unexpectedly open registration
    on deploy. Staff must explicitly enable it per game via the dashboard or
    Django admin.
    """

    dependencies = [
        ('games', '0002_seed_default_games'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='registration_open',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'When True, this game appears in the join-request form on the '
                    'landing page. Set to False to close recruitment without hiding '
                    'the game from the games showcase.'
                ),
            ),
        ),
    ]