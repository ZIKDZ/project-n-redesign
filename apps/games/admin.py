from django.contrib import admin
from .models import Game


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'slug', 'publisher', 'genre',
        'is_active', 'registration_open',        # ← both status flags visible at a glance
        'display_order', 'created_at',
    )
    list_filter = ('is_active', 'registration_open')
    search_fields = ('title', 'slug', 'publisher')
    list_editable = ('is_active', 'registration_open', 'display_order')   # ← toggle inline
    ordering = ('display_order', 'title')
    prepopulated_fields = {'slug': ('title',)}
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'publisher', 'genre', 'display_order'),
        }),
        ('Visibility', {
            'description': (
                'is_active controls whether the game appears in the public games showcase. '
                'registration_open controls whether it appears in the join-request form.'
            ),
            'fields': ('is_active', 'registration_open'),
        }),
        ('Media', {
            'fields': ('banner', 'banner_url', 'logo', 'logo_url', 'overlay_color'),
        }),
        ('Ranks', {
            'fields': ('ranks',),
        }),
    )