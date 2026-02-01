from django.db import models

class Photo(models.Model):
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='photos', null=True, blank=True)
    image = models.ImageField(upload_to="uploads/")
    name = models.CharField(max_length=255, blank=True)

    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f"Photo {self.id}"
