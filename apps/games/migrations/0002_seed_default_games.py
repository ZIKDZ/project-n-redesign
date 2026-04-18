from django.db import migrations


DEFAULT_GAMES = [
    {
        'title': 'Rocket League',
        'slug': 'rocket_league',
        'publisher': 'Psyonix',
        'genre': 'Competitive',
        'banner_url': 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg',
        'logo_url': '',
        'overlay_color': 'rgba(0,48,135,0.4)',
        'ranks': [
            'Bronze I', 'Bronze II', 'Bronze III',
            'Silver I', 'Silver II', 'Silver III',
            'Gold I', 'Gold II', 'Gold III',
            'Platinum I', 'Platinum II', 'Platinum III',
            'Diamond I', 'Diamond II', 'Diamond III',
            'Champion I', 'Champion II', 'Champion III',
            'Grand Champion I', 'Grand Champion II', 'Grand Champion III',
            'Supersonic Legend',
        ],
        'is_active': True,
        'display_order': 0,
    },
    {
        'title': 'Valorant',
        'slug': 'valorant',
        'publisher': 'Riot Games',
        'genre': 'Tactical FPS',
        'banner_url': 'https://games.gg/_next/image/?url=https%3A%2F%2Fassets.games.gg%2F1752153837845_valorant_banner_d5a4331252.jpeg&w=3840&q=75',
        'logo_url': '',
        'overlay_color': 'rgba(255,70,85,0.3)',
        'ranks': [
            'Iron 1', 'Iron 2', 'Iron 3',
            'Bronze 1', 'Bronze 2', 'Bronze 3',
            'Silver 1', 'Silver 2', 'Silver 3',
            'Gold 1', 'Gold 2', 'Gold 3',
            'Platinum 1', 'Platinum 2', 'Platinum 3',
            'Diamond 1', 'Diamond 2', 'Diamond 3',
            'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
            'Immortal 1', 'Immortal 2', 'Immortal 3',
            'Radiant',
        ],
        'is_active': True,
        'display_order': 1,
    },
    {
        'title': 'Fortnite',
        'slug': 'fortnite',
        'publisher': 'Epic Games',
        'genre': 'Battle Royale',
        'banner_url': 'https://cdn2.unrealengine.com/social-image-chapter4-s3-3840x2160-d35912cc25ad.jpg',
        'logo_url': '',
        'overlay_color': 'rgba(100,60,200,0.35)',
        'ranks': [
            'Open League - Bronze',
            'Open League - Silver',
            'Open League - Gold',
            'Open League - Platinum',
            'Contender League - Bronze',
            'Contender League - Silver',
            'Contender League - Gold',
            'Contender League - Platinum',
            'Champion League',
        ],
        'is_active': True,
        'display_order': 2,
    },
]


def seed_games(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    for g in DEFAULT_GAMES:
        Game.objects.get_or_create(slug=g['slug'], defaults=g)


def unseed_games(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    Game.objects.filter(slug__in=[g['slug'] for g in DEFAULT_GAMES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_games, unseed_games),
    ]