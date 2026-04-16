from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_news, name='list-news'),                    # GET — public
    path('all/', views.list_news_all, name='list-news-all'),        # GET — staff
    path('create/', views.create_news, name='create-news'),         # POST — staff
    path('<int:pk>/', views.update_news, name='update-news'),       # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_news, name='delete-news'),# DELETE — staff
]
