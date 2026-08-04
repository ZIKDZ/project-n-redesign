# tournaments/migrations/0002_match_double_elim_fields.py
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0001_initial'),
    ]

    operations = [
        # 1. bracket column
        migrations.AddField(
            model_name='match',
            name='bracket',
            field=models.CharField(
                choices=[
                    ('winners',     'Winners Bracket'),
                    ('losers',      'Losers Bracket'),
                    ('grand_final', 'Grand Final'),
                ],
                default='winners',
                max_length=20,
            ),
        ),
        # 2. FK to the losers-bracket match this match's loser drops into
        migrations.AddField(
            model_name='match',
            name='loser_next_match',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='loser_feeder_matches',
                to='tournaments.match',
            ),
        ),
        # 3. which slot (a/b) the loser fills in that match
        migrations.AddField(
            model_name='match',
            name='loser_next_match_slot',
            field=models.CharField(
                blank=True,
                choices=[('a', 'Slot A'), ('b', 'Slot B')],
                max_length=1,
            ),
        ),
        # 4. double_elim added to bracket_type choices (no DB change, just state)
        migrations.AlterField(
            model_name='tournament',
            name='bracket_type',
            field=models.CharField(
                choices=[
                    ('single_elim', 'Single Elimination'),
                    ('double_elim', 'Double Elimination'),
                ],
                default='single_elim',
                max_length=20,
            ),
        ),
    ]