from django.db import models


ROLE_CHOICES = [
    ('player', 'Player'),
    ('captain', 'Captain'),
    ('coach', 'Coach'),
    ('substitute', 'Substitute'),
    ('content_creator', 'Content Creator'),
]

GAME_CHOICES = [
    ('rocket_league', 'Rocket League'),
    ('valorant', 'Valorant'),
    ('fortnite', 'Fortnite'),
]


class Player(models.Model):
    username = models.CharField(max_length=100)
    ingame_username = models.CharField(max_length=100)
    real_name = models.CharField(max_length=150, blank=True)
    game = models.CharField(max_length=50, choices=GAME_CHOICES)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='player')
    rank = models.CharField(max_length=100)
    discord_username = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    avatar = models.ImageField(upload_to='players/', blank=True, null=True)
    team = models.ForeignKey(
        'teams.Team',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='players'
    )
    is_active = models.BooleanField(default=True)
    joined_at = models.DateField(auto_now_add=True)
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ['game', 'role', 'username']

    def __str__(self):
        return f"{self.username} — {self.game} ({self.role})"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'ingame_username': self.ingame_username,
            'real_name': self.real_name,
            'game': self.game,
            'role': self.role,
            'rank': self.rank,
            'discord_username': self.discord_username,
            'avatar': self.avatar.url if self.avatar else '',
            'team': self.team.name if self.team else None,
            'team_id': self.team.id if self.team else None,
            'is_active': self.is_active,
            'joined_at': self.joined_at.isoformat(),
            'bio': self.bio,
        }
