from rest_framework import serializers
from .models import MediaItem

class MediaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaItem
        fields = '__all__'

    def validate_rating(self, value):
        if value is not None and (value < 1 or value > 10):
            raise serializers.ValidationError("La note doit être comprise entre 1 et 10.")
        return value
