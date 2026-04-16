from django.db import models


TAG_CHOICES = [
    ('announcement', 'Announcement'),
    ('award', 'Award'),
    ('community', 'Community'),
    ('match', 'Match'),
    ('roster', 'Roster'),
    ('update', 'Update'),
]


class NewsPost(models.Model):
    title = models.CharField(max_length=200)
    tag = models.CharField(max_length=50, choices=TAG_CHOICES, default='announcement')
    description = models.TextField()
    thumbnail = models.ImageField(upload_to='news/', blank=True, null=True)
    thumbnail_url = models.URLField(blank=True, help_text='Use this if not uploading a file')
    published_at = models.DateField()
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return self.title

    def get_thumbnail(self):
        if self.thumbnail:
            return self.thumbnail.url
        return self.thumbnail_url or ''

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'tag': self.tag,
            'description': self.description,
            'thumbnail': self.get_thumbnail(),
            'published_at': self.published_at.isoformat(),
            'is_published': self.is_published,
        }
