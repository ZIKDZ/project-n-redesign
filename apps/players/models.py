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

    # ── Clips / Highlights ────────────────────────────────────────────────────
    clips = models.JSONField(
        default=list,
        blank=True,
        help_text='List of highlight clips: [{"title": "...", "youtube_url": "...", "description": "..."}]',
    )

    # ── Socials ───────────────────────────────────────────────────────────────
    discord_username = models.CharField(max_length=100, blank=True)
    twitter_url = models.URLField(blank=True, help_text='Twitter/X profile URL')
    instagram_url = models.URLField(blank=True, help_text='Instagram profile URL')
    twitch_url = models.URLField(blank=True, help_text='Twitch channel URL')
    kick_url = models.URLField(blank=True, help_text='Kick channel URL')
    tiktok_url = models.URLField(blank=True, help_text='TikTok profile URL')

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
            # Clips
            'clips': self.clips or [],
            # Socials
            'discord_username': self.discord_username,
            'twitter_url': self.twitter_url,
            'instagram_url': self.instagram_url,
            'twitch_url': self.twitch_url,
            'kick_url': self.kick_url,
            'tiktok_url': self.tiktok_url,
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