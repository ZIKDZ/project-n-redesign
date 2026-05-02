from django.urls import path
from . import views

urlpatterns = [
    # ── Public ────────────────────────────────────────────────────────────────
    path('', views.list_products, name='list-products'),
    path('<int:pk>/', views.get_product, name='get-product'),
    path('order/', views.submit_order, name='submit-order'),

    # ── Staff — Products ──────────────────────────────────────────────────────
    path('all/', views.list_products_all, name='list-products-all'),
    path('create/', views.create_product, name='create-product'),
    path('<int:pk>/update/', views.update_product, name='update-product'),
    path('<int:pk>/delete/', views.delete_product, name='delete-product'),

    # ── Staff — Gallery ───────────────────────────────────────────────────────
    path('<int:pk>/images/add/', views.add_gallery_image, name='add-gallery-image'),
    path('<int:pk>/images/<int:img_pk>/delete/', views.delete_gallery_image, name='delete-gallery-image'),

    # ── Staff — Orders ────────────────────────────────────────────────────────
    path('orders/', views.list_orders, name='list-orders'),
    path('orders/<int:pk>/', views.update_order, name='update-order'),
    path('orders/<int:pk>/delete/', views.delete_order, name='delete-order'),

    # ── Staff — Coupons ───────────────────────────────────────────────────────
    path('coupons/', views.list_coupons, name='list-coupons'),
    path('coupons/create/', views.create_coupon, name='create-coupon'),
    path('coupons/<int:pk>/', views.update_coupon, name='update-coupon'),
    path('coupons/<int:pk>/delete/', views.delete_coupon, name='delete-coupon'),
]