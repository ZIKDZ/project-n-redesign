from django.contrib import admin
from .models import SpotlightSlide


@admin.register(SpotlightSlide)
class SpotlightSlideAdmin(admin.ModelAdmin):
    list_display = ('title', 'media_type', 'pill_label', 'duration', 'is_active', 'display_order', 'created_at')
    list_filter = ('media_type', 'is_active')
    list_editable = ('is_active', 'display_order')
    search_fields = ('title', 'pill_label')
    ordering = ('display_order', 'created_at')
