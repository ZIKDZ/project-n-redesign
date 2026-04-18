from django.db import models


STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('reviewing', 'Reviewing'),
    ('accepted', 'Accepted'),
    ('rejected', 'Rejected'),
]


class JoinRequest(models.Model):
    # FK to the Game model — nullable so old rows / edge-cases don't break
    game = models.ForeignKey(
        'games.Game',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='join_requests',
        help_text='Game the applicant is applying for',
    )
    # Keep a plain-text fallback so we never lose data if a game is deleted
    game_slug_fallback = models.CharField(max_length=100, blank=True)

    username = models.CharField(max_length=100)
    ingame_username = models.CharField(max_length=100)
    discord_username = models.CharField(max_length=100)
    rank = models.CharField(max_length=100)
    email = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        game_name = self.game.title if self.game else self.game_slug_fallback
        return f"{self.username} — {game_name} ({self.status})"

    def to_dict(self):
        return {
            'id': self.id,
            'game': self.game.slug if self.game else self.game_slug_fallback,
            'game_title': self.game.title if self.game else self.game_slug_fallback,
            'username': self.username,
            'ingame_username': self.ingame_username,
            'discord_username': self.discord_username,
            'rank': self.rank,
            'email': self.email,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat(),
            'notes': self.notes,
        }