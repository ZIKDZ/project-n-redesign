from django.db import models
from cloudinary_storage.storage import VideoMediaCloudinaryStorage


MEDIA_TYPE_CHOICES = [
    ('video', 'Video'),
    ('image', 'Image'),
]


class SpotlightSlide(models.Model):
    title = models.CharField(max_length=150, blank=True, help_text='Internal label for staff reference')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES, default='image')

    # video_file MUST use VideoMediaCloudinaryStorage — the default MediaCloudinaryStorage
    # treats all uploads as images and throws "Invalid image file" for video content
    video_file = models.FileField(
        upload_to='spotlight/videos/',
        blank=True,
        null=True,
        storage=VideoMediaCloudinaryStorage(),
    )
    video_url = models.URLField(blank=True, help_text='External video URL (mp4, webm…)')
    image_file = models.ImageField(upload_to='spotlight/images/', blank=True, null=True)
    image_url = models.URLField(blank=True, help_text='External image URL fallback')

    href = models.URLField(blank=True, help_text='Click-through URL (leave blank for no link)')
    pill_label = models.CharField(max_length=100, blank=True, default='MATCH DAY · ROCKET LEAGUE')
    duration = models.PositiveSmallIntegerField(default=8)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'created_at']

    def __str__(self):
        return self.title or f'Slide #{self.id} ({self.media_type})'

    def get_media_url(self):
        if self.media_type == 'video':
            if self.video_file:
                return self.video_file.url
            return self.video_url
        else:
            if self.image_file:
                return self.image_file.url
            return self.image_url

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'media_type': self.media_type,
            'media_url': self.get_media_url(),
            'video_url': self.video_url or '',
            'image_url': self.image_url or '',
            'href': self.href,
            'pill_label': self.pill_label,
            'duration': self.duration,
            'is_active': self.is_active,
            'display_order': self.display_order,
        }