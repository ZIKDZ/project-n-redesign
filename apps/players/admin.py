from django.contrib import admin
from .models import Player


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('username', 'ingame_username', 'game', 'role', 'rank', 'team', 'is_active', 'joined_at')
    list_filter = ('game', 'role', 'is_active', 'team')
    search_fields = ('username', 'ingame_username', 'real_name', 'email', 'discord_username')
    list_editable = ('is_active', 'role')
    ordering = ('game', 'username')
    autocomplete_fields = ['team']
