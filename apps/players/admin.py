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
    fieldsets = (
        ('Identity', {
            'fields': ('username', 'ingame_username', 'avatar', 'bio'),
        }),
        ('Game / Role', {
            'fields': ('game', 'game_slug_fallback', 'role', 'rank', 'status', 'team'),
        }),
        ('Highlights', {
            'fields': ('clips',),
            'description': 'JSON list of {title, youtube_url, description} objects.',
        }),
        ('Social Links', {
            'fields': ('discord_username', 'twitter_url', 'instagram_url', 'twitch_url', 'kick_url', 'tiktok_url'),
        }),
        ('Personal Info (Staff Only)', {
            'fields': ('first_name', 'last_name', 'age', 'email', 'phone', 'address'),
            'classes': ('collapse',),
        }),
        ('Meta', {
            'fields': ('joined_at',),
        }),
    )