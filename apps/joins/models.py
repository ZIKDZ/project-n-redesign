from django.db import models


GAME_CHOICES = [
    ('rocket_league', 'Rocket League'),
    ('valorant', 'Valorant'),
    ('fortnite', 'Fortnite'),
]

STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('reviewing', 'Reviewing'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
]


class JoinRequest(models.Model):
    username = models.CharField(max_length=100)
    ingame_username = models.CharField(max_length=100)
    game = models.CharField(max_length=50, choices=GAME_CHOICES)
    discord_username = models.CharField(max_length=100)
    rank = models.CharField(max_length=100)
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.username} — {self.game} ({self.status})"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'ingame_username': self.ingame_username,
            'game': self.game,
            'discord_username': self.discord_username,
            'rank': self.rank,
            'email': self.email,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat(),
            'notes': self.notes,
        }
