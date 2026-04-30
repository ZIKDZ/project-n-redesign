from django.contrib import admin
from .models import Product, ProductImage, Order


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'image_url', 'display_order')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = (
        'name', 'category', 'price',
        'total_stock', 'is_active',
        'is_featured', 'display_order'
    )
    list_filter   = ('category', 'is_active', 'is_featured')
    search_fields = ('name', 'description')
    list_editable = ('is_active', 'is_featured', 'display_order')
    ordering      = ('display_order', 'name')
    inlines       = [ProductImageInline]

    # Optional: make JSON fields nicer
    readonly_fields = ()

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'price', 'category')
        }),
        ('Media', {
            'fields': ('banner', 'banner_url')
        }),
        ('Variants', {
            'fields': ('variant_config',),
            'description': 'Define attributes and variant combinations (JSON)'
        }),
        ('Custom Fields', {
            'fields': ('custom_fields',),
        }),
        ('Settings', {
            'fields': ('track_stock', 'is_active', 'is_featured', 'display_order')
        }),
    )


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = (
        'id',
        'full_name',
        'product_name_display',
        'variant_display',
        'quantity',
        'wilaya',
        'status',
        'submitted_at'
    )
    list_filter   = ('status', 'wilaya')
    search_fields = ('full_name', 'email', 'phone')
    list_editable = ('status',)
    ordering      = ('-submitted_at',)
    readonly_fields = ('submitted_at',)

    fieldsets = (
        ('Order Info', {
            'fields': ('product', 'product_name', 'quantity')
        }),
        ('Variants', {
            'fields': ('variant_values',),
        }),
        ('Custom Fields', {
            'fields': ('custom_field_values',),
        }),
        ('Customer Info', {
            'fields': ('full_name', 'email', 'phone', 'wilaya', 'address')
        }),
        ('Status', {
            'fields': ('status', 'notes', 'submitted_at')
        }),
    )

    # --- FIX: replace removed fields with computed ones ---

    def product_name_display(self, obj):
        return obj.product.name if obj.product else obj.product_name
    product_name_display.short_description = "Product"

    def variant_display(self, obj):
        if not obj.variant_values:
            return "-"
        return " / ".join(str(v) for v in obj.variant_values.values())
    variant_display.short_description = "Variants"