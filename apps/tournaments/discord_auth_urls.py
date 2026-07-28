from django.urls import path
from . import discord_auth_views as views

urlpatterns = [
    path('login/', views.discord_login, name='discord-login'),
    path('callback/', views.discord_callback, name='discord-callback'),
    path('me/', views.discord_me, name='discord-me'),
    path('logout/', views.discord_logout, name='discord-logout'),
]
