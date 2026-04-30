from django.contrib import admin
from .models import Product, ProductImage, Order


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'image_url', 'display_order')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = ('name', 'category', 'price', 'total_stock', 'is_active', 'is_featured', 'display_order')
    list_filter   = ('category', 'is_active', 'is_featured')
    search_fields = ('name', 'description')
    list_editable = ('is_active', 'is_featured', 'display_order')
    ordering      = ('display_order', 'name')
    inlines       = [ProductImageInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ('id', 'full_name', 'product_name', 'variant_size', 'variant_color', 'quantity', 'wilaya', 'status', 'submitted_at')
    list_filter   = ('status', 'wilaya')
    search_fields = ('full_name', 'email', 'phone')
    list_editable = ('status',)
    ordering      = ('-submitted_at',)
    readonly_fields = ('submitted_at',)