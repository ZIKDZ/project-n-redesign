from django.urls import path
from . import views

urlpatterns = [
    path('', views.submit_join, name='submit-join'),          # POST — public
    path('list/', views.list_joins, name='list-joins'),        # GET  — staff
    path('<int:pk>/', views.update_join_status, name='update-join'),  # PATCH — staff
]
