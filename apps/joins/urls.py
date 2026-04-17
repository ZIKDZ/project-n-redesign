from django.urls import path
from . import views

urlpatterns = [
    path('', views.submit_join, name='submit-join'),
    path('list/', views.list_joins, name='list-joins'),
    path('<int:pk>/', views.update_join_status, name='update-join'),
    path('<int:pk>/accept/', views.accept_join, name='accept-join'),  # new
]