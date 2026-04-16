from django.db import models


GAME_CHOICES = [
    ('rocket_league', 'Rocket League'),
    ('valorant', 'Valorant'),
    ('fortnite', 'Fortnite'),
]


class Team(models.Model):
    name = models.CharField(max_length=100)
    game = models.CharField(max_length=50, choices=GAME_CHOICES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['game', 'name']

    def __str__(self):
        return f"{self.name} ({self.game})"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'game': self.game,
            'description': self.description,
            'is_active': self.is_active,
            'players': [p.to_dict() for p in self.players.filter(is_active=True)],
        }
