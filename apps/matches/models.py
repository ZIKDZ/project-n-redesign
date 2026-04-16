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

    def to_dict(self):
        return {
            'id': self.id,
            'rival': self.rival,
            'match_type': self.match_type,
            'game': self.game,
            'date': self.date.isoformat(),
            'time': self.time.strftime('%H:%M'),
            'status': self.status,
            'score': self.score,
            'winner': self.winner,
        }
