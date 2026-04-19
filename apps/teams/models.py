from django.db import models


GAME_CHOICES = [
    ('rocket_league', 'Rocket League'),
    ('valorant', 'Valorant'),
    ('fortnite', 'Fortnite'),
]

VISIBILITY_CHOICES = [
    ('public', 'Public'),
    ('hidden', 'Hidden'),
]


class Team(models.Model):
    name = models.CharField(max_length=100)
    game = models.CharField(max_length=50, choices=GAME_CHOICES)
    description = models.TextField(blank=True)

    # Uploaded files (preferred)
    banner = models.ImageField(upload_to='teams/banners/', blank=True, null=True)
    logo   = models.ImageField(upload_to='teams/logos/',   blank=True, null=True)

    # External URL fallbacks (kept for backwards compatibility)
    banner_url = models.URLField(blank=True, help_text='External banner URL fallback')
    logo_url   = models.URLField(blank=True, help_text='External logo URL fallback')

    max_players = models.PositiveSmallIntegerField(default=5, help_text='Maximum number of main players')
    igl = models.ForeignKey(
        'players.Player',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='igl_of_teams',
        help_text='In-Game Leader',
    )
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='public')
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['game', 'name']

    def __str__(self):
        return f"{self.name} ({self.game})"

    def get_banner(self):
        if self.banner:
            return self.banner.url
        return self.banner_url or ''

    def get_logo(self):
        if self.logo:
            return self.logo.url
        return self.logo_url or ''

    def to_dict(self):
        main_players = self.players.filter(
            status='active', role__in=['player', 'captain', 'coach']
        )
        subs = self.players.filter(status='active', role='substitute')
        return {
            'id':          self.id,
            'name':        self.name,
            'game':        self.game,
            'description': self.description,
            'banner_url':  self.get_banner(),   # always resolves file → URL → ''
            'logo_url':    self.get_logo(),
            'max_players': self.max_players,
            'igl':         self.igl.to_dict() if self.igl else None,
            'igl_id':      self.igl_id,
            'visibility':  self.visibility,
            'is_active':   self.is_active,
            'players':     [p.to_dict() for p in main_players],
            'substitutes': [p.to_dict() for p in subs],
        }