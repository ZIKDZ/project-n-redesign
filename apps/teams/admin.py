from django.contrib import admin
from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'visibility', 'is_active', 'max_players', 'igl', 'created_at')
    list_filter = ('game', 'is_active', 'visibility')
    search_fields = ('name',)
    list_editable = ('is_active', 'visibility')
    autocomplete_fields = ['igl']