from django.urls import path
from . import views
from . import registration_views

urlpatterns = [
    # ── IMPORTANT: literal/int paths must come before <slug:slug>/ ──
    # Django matches top-to-bottom, and <slug:slug> matches almost any
    # single path segment (including "all", "create", "5", etc). If
    # <slug:slug> is listed first it silently swallows every staff route
    # below it. Multi-segment slug routes (e.g. <slug:slug>/register/)
    # don't collide either way since they're a different pattern shape.

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
        '<int:pk>/participants/<int:participant_pk>/',
        views.update_participant,
        name='update-participant',
    ),
    path(
        '<int:pk>/participants/<int:participant_pk>/delete/',
        views.delete_participant,
        name='delete-participant',
    ),

    # Public — Registration (Discord-authenticated players)
    path('<slug:slug>/my-registration/', registration_views.my_registration, name='tournament-my-registration'),
    path('<slug:slug>/register/', registration_views.register_solo, name='tournament-register-solo'),
    path('<slug:slug>/withdraw/', registration_views.withdraw_solo, name='tournament-withdraw-solo'),
    path('<slug:slug>/teams/create/', registration_views.create_team, name='tournament-team-create'),
    path('<slug:slug>/teams/join/', registration_views.join_team, name='tournament-team-join'),
    path('<slug:slug>/teams/leave/', registration_views.leave_team, name='tournament-team-leave'),
    path(
        '<slug:slug>/teams/regenerate-code/',
        registration_views.regenerate_invite_code,
        name='tournament-team-regenerate-code',
    ),
    path('<slug:slug>/teams/kick/', registration_views.kick_member, name='tournament-team-kick'),
    path('<slug:slug>/teams/transfer-captain/', registration_views.transfer_captain, name='tournament-team-transfer-captain'),
    path('<slug:slug>/teams/disband/', registration_views.disband_team, name='tournament-team-disband'),

    # Public — slug catch-all LAST, so it only catches what's left over
    path('', views.list_tournaments, name='list-tournaments'),
    path('<slug:slug>/', views.get_tournament, name='get-tournament'),
]