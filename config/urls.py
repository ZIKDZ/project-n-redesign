from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from .sitemap import sitemap_xml

urlpatterns = [
    path('admin/', admin.site.urls),
    path('sitemap.xml', sitemap_xml, name='sitemap'),

    # API endpoints
    path('api/auth/', include('apps.joins.auth_urls')),
    path('api/joins/', include('apps.joins.urls')),
    path('api/matches/', include('apps.matches.urls')),
    path('api/news/', include('apps.news.urls')),
    path('api/players/', include('apps.players.urls')),
    path('api/teams/', include('apps.teams.urls')),
    path('api/games/', include('apps.games.urls')),
    path('api/spotlight/', include('apps.spotlight.urls')),
    path('api/shop/', include('apps.shop.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns += [
    re_path(r'^(?!media/|static/|api/|sitemap\.xml).*$', TemplateView.as_view(template_name='index.html')),
]