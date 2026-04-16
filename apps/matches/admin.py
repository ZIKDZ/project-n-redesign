from django.contrib import admin
from .models import Match


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('rival', 'game', 'match_type', 'date', 'time', 'status', 'score', 'winner')
    list_filter = ('game', 'status', 'match_type')
    search_fields = ('rival',)
    list_editable = ('status', 'score', 'winner')
    ordering = ('-date', '-time')
