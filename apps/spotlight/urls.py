from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_slides, name='list-slides'),                    # GET — public
    path('all/', views.list_slides_all, name='list-slides-all'),        # GET — staff
    path('create/', views.create_slide, name='create-slide'),           # POST — staff
    path('<int:pk>/', views.update_slide, name='update-slide'),         # PUT/PATCH — staff
    path('<int:pk>/delete/', views.delete_slide, name='delete-slide'),  # DELETE — staff
]
