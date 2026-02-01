from rest_framework import serializers
from .models import Photo

class PhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()
    image_size = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", 'user', "name", "created_at", "image",  "image_url", "thumb_url", "image_size"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if request and obj.image:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url if obj.image else ""


    def get_thumb_url(self, obj):
        request = self.context.get("request")
        if request and obj.thumb:
            return request.build_absolute_uri(obj.thumb.url)
        return obj.thumb.url if obj.thumb else ""
    
    def get_image_size(self, obj):
        if not obj.image or not obj.image.size:
            return "0 B"

        size = obj.image.size  # bytes

        if size < 1024:
            return f"{size} B"
        elif size < 1024 ** 2:
            return f"{size / 1024:.2f} KB"
        elif size < 1024 ** 3:
            return f"{size / (1024 ** 2):.2f} MB"
        else:
            return f"{size / (1024 ** 3):.2f} GB"

