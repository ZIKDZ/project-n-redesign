from django.contrib import admin
from .models import Player, PlayerClip


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


@admin.register(PlayerClip)
class PlayerClipAdmin(admin.ModelAdmin):
    list_display = ('player', 'title', 'display_order', 'created_at')
    list_filter = ('player__game',)
    search_fields = ('title', 'player__username')
    list_editable = ('display_order',)
    ordering = ('player', 'display_order')
    raw_id_fields = ('player',)