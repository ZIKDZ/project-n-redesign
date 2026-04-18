from django.db import models


ROLE_CHOICES = [
    ('player', 'Player'),
    ('captain', 'Captain'),
    ('coach', 'Coach'),
    ('substitute', 'Substitute'),
    ('content_creator', 'Content Creator'),
]

STATUS_CHOICES = [
    ('active', 'Active'),
    ('suspended', 'Suspended'),
    ('inactive', 'Inactive'),
]


class Player(models.Model):
    # ── Identity ──────────────────────────────────────────────────────────────
    username = models.CharField(max_length=100)
    ingame_username = models.CharField(max_length=100)

    # ── Game / role ───────────────────────────────────────────────────────────
    game = models.ForeignKey(
        'games.Game',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='players',
        help_text='Game this player competes in',
    )
    # Keep a slug fallback so data is never lost if a game is deleted
    game_slug_fallback = models.CharField(max_length=100, blank=True)

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='player')
    rank = models.CharField(max_length=100)

    # ── Status ────────────────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # ── Team ──────────────────────────────────────────────────────────────────
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='players'
    )

    # ── Profile ───────────────────────────────────────────────────────────────
    avatar = models.ImageField(upload_to='players/', blank=True, null=True)
    bio = models.TextField(blank=True)

    # ── Socials ───────────────────────────────────────────────────────────────
    discord_username = models.CharField(max_length=100, blank=True)

    # ── Personal info ─────────────────────────────────────────────────────────
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)

    # ── Meta ──────────────────────────────────────────────────────────────────
    joined_at = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['game', 'role', 'username']

    def __str__(self):
        game_label = self.game.title if self.game else self.game_slug_fallback
        return f"{self.username} — {game_label} ({self.role})"

    @property
    def is_active(self):
        return self.status == 'active'

    def get_game_slug(self):
        return self.game.slug if self.game else self.game_slug_fallback

    def get_game_title(self):
        return self.game.title if self.game else self.game_slug_fallback

    def to_dict(self):
        return {
            'id': self.id,
            # Profile
            'username': self.username,
            'ingame_username': self.ingame_username,
            'avatar': self.avatar.url if self.avatar else '',
            'bio': self.bio,
            # Game / role
            'game': self.get_game_slug(),
            'game_id': self.game_id,
            'game_title': self.get_game_title(),
            'role': self.role,
            'rank': self.rank,
            # Status
            'status': self.status,
            'is_active': self.is_active,
            # Team
            'team': self.team.name if self.team else None,
            'team_id': self.team_id,
            # Socials
            'discord_username': self.discord_username,
            # Personal
            'first_name': self.first_name,
            'last_name': self.last_name,
            'age': self.age,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            # Meta
            'joined_at': self.joined_at.isoformat(),
        }