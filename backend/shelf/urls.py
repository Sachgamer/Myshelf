from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaItemViewSet, TMDBSearchView, RegisterView, LoginView, LogoutView, UserView, UserProfileView, PublicShelfView

router = DefaultRouter()
router.register(r'items', MediaItemViewSet, basename='mediaitem')

urlpatterns = [
    path('search/', TMDBSearchView.as_view(), name='tmdb-search'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserView.as_view(), name='me'),
    path('me/profile/', UserProfileView.as_view(), name='user-profile'),
    path('public/shelf/<str:username>/', PublicShelfView.as_view(), name='public-shelf'),
    path('', include(router.urls)),
]
