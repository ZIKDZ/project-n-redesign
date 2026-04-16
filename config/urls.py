from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/auth/', include('apps.joins.auth_urls')),
    path('api/joins/', include('apps.joins.urls')),
    path('api/matches/', include('apps.matches.urls')),
    path('api/news/', include('apps.news.urls')),
    path('api/players/', include('apps.players.urls')),
    path('api/teams/', include('apps.teams.urls')),

    # React catches everything else (landing + dashboard)
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
