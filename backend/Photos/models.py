from io import BytesIO
from django.core.files.base import ContentFile
from django.db import models
from PIL import Image


class Photo(models.Model):
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE,
        related_name="photos", null=True, blank=True
    )

    image = models.ImageField(upload_to="uploads/")
    thumb = models.ImageField(upload_to="uploads/thumbs/", blank=True, null=True)

    name = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    THUMB_SIZE = (400, 400)  # you can change

    def save(self, *args, **kwargs):
        # Save first so we have image file available
        super().save(*args, **kwargs)

        # Create/update thumbnail if missing OR image changed and thumb not matching
        if self.image and (not self.thumb):
            self._generate_thumbnail()
            # Save only thumb field to avoid recursion loop
            super().save(update_fields=["thumb"])

    def _generate_thumbnail(self):
        self.image.open()
        img = Image.open(self.image)

        # Convert to RGB (avoid errors for PNG with alpha)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        img.thumbnail(self.THUMB_SIZE, Image.Resampling.LANCZOS)

        # Make a filename
        base = self.image.name.rsplit(".", 1)[0].split("/")[-1]
        thumb_name = f"{base}_thumb.jpg"

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=80, optimize=True)
        buffer.seek(0)

        self.thumb.save(thumb_name, ContentFile(buffer.read()), save=False)

    def __str__(self):
        return self.name or f"Photo {self.id}"

