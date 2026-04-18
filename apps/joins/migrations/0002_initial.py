import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Replace the old CharField 'game' with a ForeignKey to games.Game,
    keeping a game_slug_fallback for safety.
    """

    dependencies = [
        ('joins', '0001_initial'),
        ('games', '0002_seed_default_games'),
    ]

    operations = [
        # 1. Add the fallback slug column first (nullable)
        migrations.AddField(
            model_name='joinrequest',
            name='game_slug_fallback',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),
        # 2. Copy old game string into fallback
        migrations.RunSQL(
            "UPDATE joins_joinrequest SET game_slug_fallback = game;",
            reverse_sql="UPDATE joins_joinrequest SET game = game_slug_fallback;",
        ),
        # 3. Remove the old game CharField
        migrations.RemoveField(
            model_name='joinrequest',
            name='game',
        ),
        # 4. Add the new FK (nullable)
        migrations.AddField(
            model_name='joinrequest',
            name='game',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='join_requests',
                to='games.game',
                help_text='Game the applicant is applying for',
            ),
        ),
        # 5. Back-fill FK from the slug fallback
        migrations.RunSQL(
            sql="""
                UPDATE joins_joinrequest AS jr
                SET game_id = (
                    SELECT g.id FROM games_game g WHERE g.slug = jr.game_slug_fallback LIMIT 1
                )
                WHERE jr.game_slug_fallback != '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]