from django.contrib import admin
from .models import JoinRequest


@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ('username', 'game', 'rank', 'status', 'submitted_at')
    list_filter = ('game', 'status')
    search_fields = ('username', 'email', 'discord_username')
    readonly_fields = ('submitted_at',)
    list_editable = ('status',)
