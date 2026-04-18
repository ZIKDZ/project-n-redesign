from django.contrib import admin
from .models import Player


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('username', 'ingame_username', 'game', 'role', 'rank', 'team', 'status', 'joined_at')
    list_filter = ('game', 'role', 'status', 'team')
    search_fields = ('username', 'ingame_username', 'first_name', 'last_name', 'email', 'discord_username')
    list_editable = ('status', 'role')
    ordering = ('game', 'username')
    autocomplete_fields = ['team']
    readonly_fields = ('joined_at',)