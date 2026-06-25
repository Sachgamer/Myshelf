from django.db import models
from django.contrib.auth.models import User

class MediaItem(models.Model):
    MEDIA_TYPES = [
        ('movie', 'Film'),
        ('tv', 'Série'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='media_items', null=True, blank=True)

    tmdb_id = models.IntegerField()
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    title = models.CharField(max_length=255)
    poster_path = models.CharField(max_length=255, null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)
    overview = models.TextField(null=True, blank=True)
    
    # User status flags
    watched = models.BooleanField(default=False)
    watching = models.BooleanField(default=False)
    current_season = models.IntegerField(default=1, null=True, blank=True)
    current_episode = models.IntegerField(default=0, null=True, blank=True)
    total_seasons = models.IntegerField(null=True, blank=True)
    total_episodes = models.IntegerField(null=True, blank=True)
    seasons_data = models.JSONField(null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)  # rating out of 10
    dvd_owned = models.BooleanField(default=False)
    dvd_wishlist = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.watched:
            self.watching = False
        if self.watching:
            self.watched = False
            self.rating = None
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['tmdb_id', 'media_type'], name='unique_tmdb_media_item')
        ]
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.get_media_type_display()})"


from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_public = models.BooleanField(default=False)

    def __str__(self):
        return f"Profil de {self.user.username} (Public: {self.is_public})"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        UserProfile.objects.create(user=instance)

