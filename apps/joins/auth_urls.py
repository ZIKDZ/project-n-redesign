from django.urls import path
from . import auth_views

urlpatterns = [
    path('login/', auth_views.login_view, name='api-login'),
    path('logout/', auth_views.logout_view, name='api-logout'),
    path('me/', auth_views.me_view, name='api-me'),
]
