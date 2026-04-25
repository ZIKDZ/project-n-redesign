from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_players, name='list-players'),                  # GET — public
    path('all/', views.list_players_all, name='list-players-all'),      # GET — staff
    path('create/', views.create_player, name='create-player'),         # POST — staff
    path('<int:pk>/', views.update_player, name='update-player'),       # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_player, name='delete-player'),# DELETE — staff
    path('<int:pk>/profile/', views.get_player, name='get-player'),     # GET — public
]