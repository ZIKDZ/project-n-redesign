import django.db.models.deletion
from django.db import migrations, models

import apps.tournaments.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('games', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='TournamentPlayer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('discord_id', models.CharField(max_length=32, unique=True)),
                ('discord_username', models.CharField(max_length=100)),
                ('discord_avatar', models.URLField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['discord_username']},
        ),
        migrations.CreateModel(
            name='Tournament',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField(max_length=220, unique=True)),
                ('format', models.CharField(choices=[('solo', 'Solo'), ('team', 'Team')], default='solo', max_length=10)),
                ('team_size', models.PositiveSmallIntegerField(blank=True, help_text='Required team size. Only used when format="team".', null=True)),
                ('bracket_type', models.CharField(choices=[('single_elim', 'Single Elimination')], default='single_elim', max_length=20)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('open', 'Registration Open'), ('closed', 'Registration Closed'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='draft', max_length=20)),
                ('description', models.TextField(blank=True, help_text='Short public summary shown on cards / hero sections.')),
                ('rules', models.TextField(blank=True, help_text='Full rules & details. Staff write this in Markdown.')),
                ('requirements', models.TextField(blank=True, help_text='Entry requirements, e.g. minimum rank (plain text).')),
                ('banner', models.ImageField(blank=True, null=True, upload_to='tournaments/banners/')),
                ('banner_url', models.URLField(blank=True, help_text='External URL fallback')),
                ('registration_open_at', models.DateTimeField(blank=True, help_text='When registration opens. Leave blank to open immediately when status is set to "open".', null=True)),
                ('registration_deadline', models.DateTimeField(blank=True, help_text='Hard cutoff — registration closes automatically after this time.', null=True)),
                ('start_date', models.DateTimeField(blank=True, help_text='When the tournament itself kicks off.', null=True)),
                ('max_participants', models.PositiveSmallIntegerField(blank=True, help_text='Max solo players, or max teams, depending on format. Leave blank for unlimited.', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('game', models.ForeignKey(blank=True, help_text='Game this tournament is for', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tournaments', to='games.game')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='Placement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('placement', models.CharField(help_text='e.g. "1st", "2nd", "3rd-4th"', max_length=50)),
                ('reward_text', models.CharField(blank=True, help_text='e.g. "15,000 DZD + in-game currency"', max_length=255)),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('tournament', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='placements', to='tournaments.tournament')),
            ],
            options={'ordering': ['display_order', 'id']},
        ),
        migrations.CreateModel(
            name='TournamentTeam',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('tag', models.CharField(blank=True, max_length=10)),
                ('logo', models.ImageField(blank=True, null=True, upload_to='tournaments/team_logos/')),
                ('logo_url', models.URLField(blank=True)),
                ('invite_code', models.CharField(default=apps.tournaments.models.generate_invite_code, max_length=12, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('captain', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='captained_teams', to='tournaments.tournamentplayer')),
                ('tournament', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='teams', to='tournaments.tournament')),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='TournamentTeamMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('player', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='team_memberships', to='tournaments.tournamentplayer')),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='tournaments.tournamentteam')),
            ],
            options={'ordering': ['joined_at'], 'unique_together': {('team', 'player')}},
        ),
        migrations.CreateModel(
            name='Participant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('seed', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('registered', 'Registered'), ('checked_in', 'Checked In'), ('disqualified', 'Disqualified'), ('withdrawn', 'Withdrawn')], default='registered', max_length=20)),
                ('registered_at', models.DateTimeField(auto_now_add=True)),
                ('player', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='solo_entries', to='tournaments.tournamentplayer')),
                ('team', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='entry', to='tournaments.tournamentteam')),
                ('tournament', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='tournaments.tournament')),
            ],
            options={'ordering': ['seed', 'registered_at']},
        ),
        migrations.CreateModel(
            name='Match',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('round_number', models.PositiveSmallIntegerField()),
                ('position', models.PositiveSmallIntegerField(help_text='Slot index within the round, starting at 1.')),
                ('score_a', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('score_b', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('ready', 'Ready'), ('live', 'Live'), ('completed', 'Completed'), ('bye', 'Bye')], default='pending', max_length=20)),
                ('scheduled_time', models.DateTimeField(blank=True, null=True)),
                ('next_match_slot', models.CharField(blank=True, choices=[('a', 'Slot A'), ('b', 'Slot B')], max_length=1)),
                ('next_match', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='feeds_from', to='tournaments.match')),
                ('participant_a', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='matches_as_a', to='tournaments.participant')),
                ('participant_b', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='matches_as_b', to='tournaments.participant')),
                ('winner', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='matches_won', to='tournaments.participant')),
                ('tournament', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='matches', to='tournaments.tournament')),
            ],
            options={'ordering': ['round_number', 'position']},
        ),
    ]
