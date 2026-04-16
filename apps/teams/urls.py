from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_teams, name='list-teams'),                    # GET — public
    path('all/', views.list_teams_all, name='list-teams-all'),        # GET — staff
    path('create/', views.create_team, name='create-team'),           # POST — staff
    path('<int:pk>/', views.update_team, name='update-team'),         # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_team, name='delete-team'),  # DELETE — staff
]
