from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MediaItemViewSet, TMDBSearchView

router = DefaultRouter()
router.register(r'items', MediaItemViewSet, basename='mediaitem')

urlpatterns = [
    path('search/', TMDBSearchView.as_view(), name='tmdb-search'),
    path('', include(router.urls)),
]
