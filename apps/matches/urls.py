from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_matches, name='list-matches'),          # GET  — public
    path('create/', views.create_match, name='create-match'),   # POST — staff
    path('<int:pk>/', views.update_match, name='update-match'), # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_match, name='delete-match'),  # DELETE — staff
]
