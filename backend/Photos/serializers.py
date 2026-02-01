from rest_framework import serializers
from .models import Photo

class PhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ["id", 'user', "name", "created_at", "image",  "image_url", "thumb_url"]

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
    