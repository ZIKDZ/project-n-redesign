from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_games, name='list-games'),                    # GET — public
    path('all/', views.list_games_all, name='list-games-all'),        # GET — staff
    path('create/', views.create_game, name='create-game'),           # POST — staff
    path('<int:pk>/', views.update_game, name='update-game'),         # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_game, name='delete-game'),  # DELETE — staff
]