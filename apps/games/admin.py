from django.contrib import admin
from .models import Game
 
 
@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'publisher', 'genre', 'is_active', 'display_order', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'slug', 'publisher')
    list_editable = ('is_active', 'display_order')
    ordering = ('display_order', 'title')
    prepopulated_fields = {'slug': ('title',)}