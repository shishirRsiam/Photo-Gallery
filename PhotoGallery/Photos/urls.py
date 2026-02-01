from django.urls import path
from .views import PhotoListCreateAPIView, PhotoDeleteAPIView

urlpatterns = [
    path("photos/", PhotoListCreateAPIView.as_view(), name="photo-list-create"),
    path("photos/<int:pk>/", PhotoDeleteAPIView.as_view(), name="photo-delete"),
]
