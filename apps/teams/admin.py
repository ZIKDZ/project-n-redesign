from django.contrib import admin
from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'game', 'is_active', 'created_at')
    list_filter = ('game', 'is_active')
    search_fields = ('name',)
    list_editable = ('is_active',)
