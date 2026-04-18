from django.db import models


class Game(models.Model):
    """A game the organisation competes in."""

    title = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, help_text='Used in API / join form, e.g. rocket_league')
    publisher = models.CharField(max_length=100, blank=True)
    genre = models.CharField(max_length=100, blank=True, help_text='e.g. Competitive, Tactical FPS, Battle Royale')
    banner = models.ImageField(upload_to='games/banners/', blank=True, null=True)
    banner_url = models.URLField(blank=True, help_text='External URL fallback if no file uploaded')
    logo = models.ImageField(upload_to='games/logos/', blank=True, null=True)
    logo_url = models.URLField(blank=True, help_text='External URL fallback if no file uploaded')
    overlay_color = models.CharField(
        max_length=40, blank=True,
        help_text='CSS rgba/hex for the card gradient overlay, e.g. rgba(0,48,135,0.4)'
    )
    ranks = models.JSONField(
        default=list, blank=True,
        help_text='Ordered list of rank names, e.g. ["Bronze","Silver","Gold"]'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Controls whether the game appears on the public site (games section, join form).'
    )
    registration_open = models.BooleanField(
        default=False,
        help_text=(
            'When True, this game appears in the join-request form on the landing page. '
            'Set to False to close recruitment without hiding the game from the games showcase.'
        )
    )
    display_order = models.PositiveSmallIntegerField(default=0, help_text='Lower = shown first')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'title']

    def __str__(self):
        return self.title

    def get_banner(self):
        if self.banner:
            return self.banner.url
        return self.banner_url or ''

    def get_logo(self):
        if self.logo:
            return self.logo.url
        return self.logo_url or ''

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'publisher': self.publisher,
            'genre': self.genre,
            'banner': self.get_banner(),
            'logo': self.get_logo(),
            'overlay_color': self.overlay_color,
            'ranks': self.ranks,
            'is_active': self.is_active,
            'registration_open': self.registration_open,
            'display_order': self.display_order,
        }