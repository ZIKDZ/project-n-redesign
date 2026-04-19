from django.db import models


GAME_CHOICES = [
    ('rocket_league', 'Rocket League'),
    ('valorant', 'Valorant'),
    ('fortnite', 'Fortnite'),
]

STATUS_CHOICES = [
    ('upcoming', 'Upcoming'),
    ('live', 'Live'),
    ('completed', 'Completed'),
]

MATCH_TYPE_CHOICES = [
    ('tournament', 'Tournament'),
    ('practice', 'Practice'),
    ('scrim', 'Scrim'),
    ('friendly', 'Friendly'),
]

WINNER_CHOICES = [
    ('nbl', 'NBL Esport'),
    ('rival', 'Rival'),
    ('draw', 'Draw'),
]


class Match(models.Model):
    rival = models.CharField(max_length=100)
    rival_logo = models.ImageField(
        upload_to='matches/logos/', blank=True, null=True,
        help_text='Upload rival team logo',
    )
    rival_logo_url = models.URLField(
        blank=True,
        help_text='External rival logo URL fallback',
    )
    match_type = models.CharField(max_length=20, choices=MATCH_TYPE_CHOICES, default='tournament')
    game = models.CharField(max_length=50, choices=GAME_CHOICES)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    score = models.CharField(max_length=20, blank=True, help_text='e.g. 3 — 1')
    winner = models.CharField(max_length=10, choices=WINNER_CHOICES, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f"NBL vs {self.rival} — {self.game} ({self.date})"

    def get_rival_logo(self):
        if self.rival_logo:
            return self.rival_logo.url
        return self.rival_logo_url or ''

    def to_dict(self):
        date_val = self.date.isoformat() if hasattr(self.date, 'isoformat') else str(self.date)
        time_val = self.time.strftime('%H:%M') if hasattr(self.time, 'strftime') else str(self.time)[:5]
        return {
            'id': self.id,
            'rival': self.rival,
            'rival_logo': self.get_rival_logo(),
            'match_type': self.match_type,
            'game': self.game,
            'date': date_val,
            'time': time_val,
            'status': self.status,
            'score': self.score,
            'winner': self.winner,
        }