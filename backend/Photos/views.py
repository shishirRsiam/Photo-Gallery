from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Photo
from .serializers import PhotoSerializer

class PhotoListCreateAPIView(APIView):
    def get(self, request):
        photos = Photo.objects.order_by("-created_at")[:100]
        ser = PhotoSerializer(photos, many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request):
        # support multiple files with key "images"
        files = request.FILES.getlist("images")
        if not files:
            # support single file with key "image"
            single = request.FILES.get("image")
            if single:
                files = [single]

        if not files:
            return Response({"detail": "No image uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for f in files:
            try:
                photo = Photo.objects.create(
                    image=f,
                    name=f.name
                )
                created.append(photo)
            except Exception as e:
                print(f"Error uploading file {f.name}: {e}")

        ser = PhotoSerializer(created, many=True, context={"request": request})
        return Response(ser.data, status=status.HTTP_201_CREATED)


class PhotoDeleteAPIView(APIView):
    def delete(self, request, pk):
        photo = get_object_or_404(Photo, pk=pk)
        photo.image.delete(save=False)  # delete file
        photo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

