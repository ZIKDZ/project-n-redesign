from django.urls import path
from . import views

urlpatterns = [
    # ── IMPORTANT: literal/int paths must come before <slug:slug>/ ──
    # Django matches top-to-bottom, and <slug:slug> matches almost any
    # single path segment (including "all", "create", "5", etc).
    # Previously <slug:slug>/ was listed first and silently swallowed
    # every staff route below it, causing 404s on /all/ and 405s on
    # /create/ (POST never reached create_tournament).

    # Staff
    path('all/', views.list_tournaments_all, name='list-tournaments-all'),
    path('create/', views.create_tournament, name='create-tournament'),
    path('<int:pk>/', views.get_tournament_staff, name='get-tournament-staff'),
    path('<int:pk>/update/', views.update_tournament, name='update-tournament'),
    path('<int:pk>/delete/', views.delete_tournament, name='delete-tournament'),

    # Placements
    path('<int:pk>/placements/create/', views.create_placement, name='create-placement'),
    path(
        '<int:pk>/placements/<int:placement_pk>/update/',
        views.update_placement,
        name='update-placement',
    ),
    path(
        '<int:pk>/placements/<int:placement_pk>/delete/',
        views.delete_placement,
        name='delete-placement',
    ),

    # Public — slug catch-all LAST, so it only catches what's left over
    path('', views.list_tournaments, name='list-tournaments'),
    path('<slug:slug>/', views.get_tournament, name='get-tournament'),
]