from django.urls import path
from . import views

urlpatterns = [
    # ── IMPORTANT: literal/int paths must come before <slug:slug>/ ──
    # Django matches top-to-bottom, and <slug:slug> matches almost any
    # single path segment (including "all", "create", "5", etc).

    # Staff — Tournaments
    path('all/', views.list_tournaments_all, name='list-tournaments-all'),
    path('create/', views.create_tournament, name='create-tournament'),
    path('<int:pk>/', views.get_tournament_staff, name='get-tournament-staff'),
    path('<int:pk>/update/', views.update_tournament, name='update-tournament'),
    path('<int:pk>/delete/', views.delete_tournament, name='delete-tournament'),

    # Staff — Placements
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

    # Staff — Participants
    path('<int:pk>/participants/', views.list_participants, name='list-participants'),
    path(
        '<int:pk>/participants/<int:participant_pk>/update/',
        views.update_participant,
        name='update-participant',
    ),
    path(
        '<int:pk>/participants/<int:participant_pk>/delete/',
        views.delete_participant,
        name='delete-participant',
    ),

    # Public — Registration (Discord-authenticated players)
    path('<slug:slug>/register/', views.register_solo, name='tournament-register-solo'),
    path('<slug:slug>/teams/create/', views.create_team, name='tournament-team-create'),
    path('<slug:slug>/teams/join/', views.join_team, name='tournament-team-join'),
    path('<slug:slug>/me/', views.get_my_participation, name='tournament-me'),

    # Public — slug catch-all LAST, so it only catches what's left over
    path('', views.list_tournaments, name='list-tournaments'),
    path('<slug:slug>/', views.get_tournament, name='get-tournament'),
]