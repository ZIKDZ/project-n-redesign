import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    - Replace game CharField with a ForeignKey to games.Game (+ slug fallback)
    - Replace is_active BooleanField with a status CharField
    - Add personal info fields: first_name, last_name, age, phone, address
    - Remove legacy real_name field
    """

    dependencies = [
        ('players', '0001_initial'),
        ('games', '0002_seed_default_games'),
    ]

    operations = [
        # ── 1. Add game_slug_fallback ─────────────────────────────────────────
        migrations.AddField(
            model_name='player',
            name='game_slug_fallback',
            field=models.CharField(blank=True, max_length=100, default=''),
            preserve_default=False,
        ),

        # ── 2. Copy old game value into fallback ──────────────────────────────
        migrations.RunSQL(
            "UPDATE players_player SET game_slug_fallback = game;",
            reverse_sql="UPDATE players_player SET game = game_slug_fallback;",
        ),

        # ── 3. Remove old game CharField ──────────────────────────────────────
        migrations.RemoveField(
            model_name='player',
            name='game',
        ),

        # ── 4. Add new game FK (nullable) ─────────────────────────────────────
        migrations.AddField(
            model_name='player',
            name='game',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='players',
                to='games.game',
                help_text='Game this player competes in',
            ),
        ),

        # ── 5. Back-fill FK from slug fallback ───────────────────────────────
        migrations.RunSQL(
            sql="""
                UPDATE players_player AS p
                SET game_id = (
                    SELECT g.id FROM games_game g
                    WHERE g.slug = p.game_slug_fallback LIMIT 1
                )
                WHERE p.game_slug_fallback != '';
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 6. Add status field ───────────────────────────────────────────────
        migrations.AddField(
            model_name='player',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[('active', 'Active'), ('suspended', 'Suspended'), ('inactive', 'Inactive')],
                default='active',
            ),
        ),

        # ── 7. Migrate is_active → status ─────────────────────────────────────
        migrations.RunSQL(
            sql="UPDATE players_player SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;",
            reverse_sql="UPDATE players_player SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END;",
        ),

        # ── 8. Drop is_active ─────────────────────────────────────────────────
        migrations.RemoveField(
            model_name='player',
            name='is_active',
        ),

        # ── 9. Remove legacy real_name ────────────────────────────────────────
        migrations.RemoveField(
            model_name='player',
            name='real_name',
        ),

        # ── 10. Add personal info fields ──────────────────────────────────────
        migrations.AddField(
            model_name='player',
            name='first_name',
            field=models.CharField(max_length=100, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='player',
            name='last_name',
            field=models.CharField(max_length=100, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='player',
            name='age',
            field=models.PositiveSmallIntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='player',
            name='phone',
            field=models.CharField(max_length=30, blank=True, default=''),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='player',
            name='address',
            field=models.CharField(max_length=255, blank=True, default=''),
            preserve_default=False,
        ),
    ]