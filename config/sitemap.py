from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone

from apps.news.models import NewsPost
from apps.games.models import Game


def sitemap_xml(request):
    """
    Public-only sitemap — home, news list, published articles, and
    active game roster pages. Dashboard, login, admin and shop are
    intentionally excluded (see robots.txt + NoIndexPrivatePathsMiddleware).
    """
    site_url = settings.SITE_URL.rstrip('/')
    today = timezone.now().date().isoformat()

    urls = [
        {'loc': f'{site_url}/', 'changefreq': 'daily', 'priority': '1.0', 'lastmod': today},
        {'loc': f'{site_url}/news', 'changefreq': 'daily', 'priority': '0.8', 'lastmod': today},
    ]

    for game in Game.objects.filter(is_active=True):
        urls.append({
            'loc': f'{site_url}/roster/{game.slug}',
            'changefreq': 'weekly',
            'priority': '0.7',
            'lastmod': today,
        })

    for post in NewsPost.objects.filter(is_published=True).order_by('-published_at'):
        urls.append({
            'loc': f'{site_url}/news/{post.id}',
            'changefreq': 'monthly',
            'priority': '0.6',
            'lastmod': post.published_at.isoformat(),
        })

    xml = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append(
            '<url>'
            f'<loc>{u["loc"]}</loc>'
            f'<lastmod>{u["lastmod"]}</lastmod>'
            f'<changefreq>{u["changefreq"]}</changefreq>'
            f'<priority>{u["priority"]}</priority>'
            '</url>'
        )
    xml.append('</urlset>')

    return HttpResponse('\n'.join(xml), content_type='application/xml')