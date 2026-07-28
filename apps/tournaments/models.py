import secrets

from django.db import models
from django.utils import timezone


TOURNAMENT_FORMAT_CHOICES = [
    ('solo', 'Solo'),
    ('team', 'Team'),
]

# Kept as a choices list (rather than a free string) on purpose — this is the
# hook point for adding 'double_elim' / 'round_robin' later without touching
# the schema, only the bracket-generation logic.
BRACKET_TYPE_CHOICES = [
    ('single_elim', 'Single Elimination'),
]

TOURNAMENT_STATUS_CHOICES = [
    ('draft', 'Draft'),                    # staff still configuring — never public
    ('open', 'Registration Open'),
    ('closed', 'Registration Closed'),     # deadline passed, bracket not generated yet
    ('in_progress', 'In Progress'),        # bracket live
    ('completed', 'Completed'),
]

PARTICIPANT_STATUS_CHOICES = [
    ('registered', 'Registered'),
    ('checked_in', 'Checked In'),
    ('disqualified', 'Disqualified'),
    ('withdrawn', 'Withdrawn'),
]

MATCH_STATUS_CHOICES = [
    ('pending', 'Pending'),      # waiting on participants from earlier rounds
    ('ready', 'Ready'),          # both participants known, not started
    ('live', 'Live'),
    ('completed', 'Completed'),
    ('bye', 'Bye'),              # auto-advance, no opponent
]


def generate_invite_code():
    return secrets.token_hex(4).upper()  # 8 chars, e.g. "A1B2C3D4"


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)

    game = models.ForeignKey(
        'games.Game', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tournaments',
        help_text='Game this tournament is for',
    )

    format = models.CharField(max_length=10, choices=TOURNAMENT_FORMAT_CHOICES, default='solo')
    team_size = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Required team size. Only used when format="team".',
    )

    bracket_type = models.CharField(max_length=20, choices=BRACKET_TYPE_CHOICES, default='single_elim')
    status = models.CharField(max_length=20, choices=TOURNAMENT_STATUS_CHOICES, default='draft')

    description = models.TextField(blank=True, help_text='Short public summary shown on cards / hero sections.')
    rules = models.TextField(blank=True, help_text='Full rules & details. Staff write this in Markdown.')
    requirements = models.TextField(blank=True, help_text='Entry requirements, e.g. minimum rank (plain text).')

    banner = models.ImageField(upload_to='tournaments/banners/', blank=True, null=True)
    banner_url = models.URLField(blank=True, help_text='External URL fallback')

    registration_open_at = models.DateTimeField(
        null=True, blank=True,
        help_text='When registration opens. Leave blank to open immediately when status is set to "open".',
    )
    registration_deadline = models.DateTimeField(
        null=True, blank=True,
        help_text='Hard cutoff — registration closes automatically after this time.',
    )
    start_date = models.DateTimeField(null=True, blank=True, help_text='When the tournament itself kicks off.')

    max_participants = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Max solo players, or max teams, depending on format. Leave blank for unlimited.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def get_banner(self):
        if self.banner:
            return self.banner.url
        return self.banner_url or ''

    def registration_is_open(self):
        if self.status != 'open':
            return False
        now = timezone.now()
        if self.registration_open_at and now < self.registration_open_at:
            return False
        if self.registration_deadline and now > self.registration_deadline:
            return False
        return True

    def to_dict(self, include_relations=True):
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'game': self.game.slug if self.game else None,
            'game_title': self.game.title if self.game else '',
            'format': self.format,
            'team_size': self.team_size,
            'bracket_type': self.bracket_type,
            'status': self.status,
            'description': self.description,
            'rules': self.rules,
            'requirements': self.requirements,
            'banner': self.get_banner(),
            'registration_open_at': self.registration_open_at.isoformat() if self.registration_open_at else None,
            'registration_deadline': self.registration_deadline.isoformat() if self.registration_deadline else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'max_participants': self.max_participants,
            'registration_open': self.registration_is_open(),
            'created_at': self.created_at.isoformat(),
        }
        if include_relations:
            data['placements'] = [p.to_dict() for p in self.placements.all()]
            data['participant_count'] = self.participants.count()
        return data


class Placement(models.Model):
    """One reward row per tournament, e.g. 1st / 2nd / 3rd-4th."""
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='placements')
    placement = models.CharField(max_length=50, help_text='e.g. "1st", "2nd", "3rd-4th"')
    reward_text = models.CharField(max_length=255, blank=True, help_text='e.g. "15,000 DZD + in-game currency"')
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['display_order', 'id']

    def __str__(self):
        return f'{self.tournament.name} — {self.placement}'

    def to_dict(self):
        return {
            'id': self.id,
            'placement': self.placement,
            'reward_text': self.reward_text,
            'display_order': self.display_order,
        }


class TournamentPlayer(models.Model):
    """
    A Discord-verified identity. One row per Discord account, shared across
    every tournament — this is the only "public account" model on the site.
    """
    discord_id = models.CharField(max_length=32, unique=True)
    discord_username = models.CharField(max_length=100)
    discord_avatar = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['discord_username']

    def __str__(self):
        return self.discord_username

    def to_dict(self):
        return {
            'id': self.id,
            'discord_id': self.discord_id,
            'discord_username': self.discord_username,
            'discord_avatar': self.discord_avatar,
        }


class TournamentTeam(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=100)
    tag = models.CharField(max_length=10, blank=True)

    logo = models.ImageField(upload_to='tournaments/team_logos/', blank=True, null=True)
    logo_url = models.URLField(blank=True)

    captain = models.ForeignKey(
        TournamentPlayer, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='captained_teams',
    )
    invite_code = models.CharField(max_length=12, unique=True, default=generate_invite_code)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.tournament.name})'

    def get_logo(self):
        if self.logo:
            return self.logo.url
        return self.logo_url or ''

    def to_dict(self, include_members=True):
        data = {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'name': self.name,
            'tag': self.tag,
            'logo': self.get_logo(),
            'captain': self.captain.to_dict() if self.captain else None,
            'invite_code': self.invite_code,
            'member_count': self.members.count(),
        }
        if include_members:
            data['members'] = [m.to_dict() for m in self.members.select_related('player').all()]
        return data


class TournamentTeamMember(models.Model):
    team = models.ForeignKey(TournamentTeam, on_delete=models.CASCADE, related_name='members')
    player = models.ForeignKey(TournamentPlayer, on_delete=models.CASCADE, related_name='team_memberships')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'player')
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.player.discord_username} @ {self.team.name}'

    def to_dict(self):
        return {
            'id': self.id,
            'player': self.player.to_dict(),
            'is_captain': self.team.captain_id == self.player_id,
            'joined_at': self.joined_at.isoformat(),
        }


class Participant(models.Model):
    """
    Unified registration row that a Match can point to — either a solo
    player or a team, depending on the tournament's format. Keeping one
    generic model here (instead of separate solo/team match fields) is what
    lets the bracket logic stay format-agnostic.
    """
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    player = models.ForeignKey(
        TournamentPlayer, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='solo_entries',
    )
    team = models.ForeignKey(
        TournamentTeam, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='entry',
    )
    seed = models.PositiveSmallIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=PARTICIPANT_STATUS_CHOICES, default='registered')
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['seed', 'registered_at']

    def __str__(self):
        return self.display_name

    @property
    def display_name(self):
        if self.team:
            return self.team.name
        if self.player:
            return self.player.discord_username
        return 'Unknown'

    def to_dict(self):
        return {
            'id': self.id,
            'tournament_id': self.tournament_id,
            'kind': 'team' if self.team_id else 'solo',
            'display_name': self.display_name,
            'player': self.player.to_dict() if self.player else None,
            'team': self.team.to_dict(include_members=False) if self.team else None,
            'seed': self.seed,
            'status': self.status,
            'registered_at': self.registered_at.isoformat(),
        }


class Match(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='matches')
    round_number = models.PositiveSmallIntegerField()
    position = models.PositiveSmallIntegerField(help_text='Slot index within the round, starting at 1.')

    participant_a = models.ForeignKey(
        Participant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='matches_as_a',
    )
    participant_b = models.ForeignKey(
        Participant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='matches_as_b',
    )

    score_a = models.PositiveSmallIntegerField(null=True, blank=True)
    score_b = models.PositiveSmallIntegerField(null=True, blank=True)

    winner = models.ForeignKey(
        Participant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='matches_won',
    )
    status = models.CharField(max_length=20, choices=MATCH_STATUS_CHOICES, default='pending')
    scheduled_time = models.DateTimeField(null=True, blank=True)

    # Bracket progression: winner of this match feeds into `next_match`,
    # occupying either its participant_a or participant_b slot.
    next_match = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='feeds_from',
    )
    next_match_slot = models.CharField(max_length=1, blank=True, choices=[('a', 'Slot A'), ('b', 'Slot B')])

    class Meta:
        ordering = ['round_number', 'position']

    def __str__(self):
        return f'{self.tournament.name} — R{self.round_number} #{self.position}'

    def to_dict(self):
        return {
            'id': self.id,
            'round_number': self.round_number,
            'position': self.position,
            'participant_a': self.participant_a.to_dict() if self.participant_a else None,
            'participant_b': self.participant_b.to_dict() if self.participant_b else None,
            'score_a': self.score_a,
            'score_b': self.score_b,
            'winner_id': self.winner_id,
            'status': self.status,
            'scheduled_time': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'next_match_id': self.next_match_id,
            'next_match_slot': self.next_match_slot,
        }