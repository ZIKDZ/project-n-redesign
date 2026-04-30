# models.py

from django.db import models

CATEGORY_CHOICES = [
    ('jersey',    'Jersey'),
    ('hoodie',    'Hoodie'),
    ('cap',       'Cap'),
    ('accessory', 'Accessory'),
    ('other',     'Other'),
]

ORDER_STATUS_CHOICES = [
    ('pending',   'Pending'),
    ('confirmed', 'Confirmed'),
    ('shipped',   'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
]

WILAYA_CHOICES = [
    ('01', 'Adrar'), ('02', 'Chlef'), ('03', 'Laghouat'), ('04', 'Oum El Bouaghi'),
    ('05', 'Batna'), ('06', 'Béjaïa'), ('07', 'Biskra'), ('08', 'Béchar'),
    ('09', 'Blida'), ('10', 'Bouira'), ('11', 'Tamanrasset'), ('12', 'Tébessa'),
    ('13', 'Tlemcen'), ('14', 'Tiaret'), ('15', 'Tizi Ouzou'), ('16', 'Alger'),
    ('17', 'Djelfa'), ('18', 'Jijel'), ('19', 'Sétif'), ('20', 'Saïda'),
    ('21', 'Skikda'), ('22', 'Sidi Bel Abbès'), ('23', 'Annaba'), ('24', 'Guelma'),
    ('25', 'Constantine'), ('26', 'Médéa'), ('27', 'Mostaganem'), ('28', "M'Sila"),
    ('29', 'Mascara'), ('30', 'Ouargla'), ('31', 'Oran'), ('32', 'El Bayadh'),
    ('33', 'Illizi'), ('34', 'Bordj Bou Arréridj'), ('35', 'Boumerdès'),
    ('36', 'El Tarf'), ('37', 'Tindouf'), ('38', 'Tissemsilt'), ('39', 'El Oued'),
    ('40', 'Khenchela'), ('41', 'Souk Ahras'), ('42', 'Tipaza'), ('43', 'Mila'),
    ('44', 'Aïn Defla'), ('45', 'Naâma'), ('46', 'Aïn Témouchent'),
    ('47', 'Ghardaïa'), ('48', 'Relizane'), ('49', "El M'Ghair"), ('50', 'El Meniaa'),
    ('51', 'Ouled Djellal'), ('52', 'Bordj Badji Mokhtar'), ('53', 'Béni Abbès'),
    ('54', 'Timimoun'), ('55', 'Touggourt'), ('56', 'Djanet'), ('57', 'In Salah'),
    ('58', 'In Guezzam'),
]


class Product(models.Model):
    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    price         = models.DecimalField(max_digits=10, decimal_places=2)
    category      = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='jersey')

    banner        = models.ImageField(upload_to='shop/banners/', blank=True, null=True)
    banner_url    = models.URLField(blank=True, help_text='External URL fallback')

    # Variants: [{"size": "M", "color": "black", "stock": 10}, ...]
    variants      = models.JSONField(
        default=list, blank=True,
        help_text='List of size/color/stock variants'
    )

    # ── NEW: stock tracking toggle ──────────────────────────────────────────
    track_stock   = models.BooleanField(
        default=True,
        help_text='When disabled, stock numbers are ignored and the product is always shown as available'
    )

    is_active     = models.BooleanField(default=True)
    is_featured   = models.BooleanField(default=False, help_text='Show in hero/featured spot')
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.category})"

    def get_banner(self):
        if self.banner:
            return self.banner.url
        return self.banner_url or ''

    def total_stock(self):
        # If stock tracking is off, return None to signal "unlimited"
        if not self.track_stock:
            return None
        return sum(v.get('stock', 0) for v in (self.variants or []))

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'description':   self.description,
            'price':         str(self.price),
            'category':      self.category,
            'banner':        self.get_banner(),
            'variants':      self.variants or [],
            'track_stock':   self.track_stock,           # ← NEW
            'total_stock':   self.total_stock(),          # None when tracking off
            'is_active':     self.is_active,
            'is_featured':   self.is_featured,
            'display_order': self.display_order,
        }


class ProductImage(models.Model):
    """Additional gallery images for a product."""
    product       = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image         = models.ImageField(upload_to='shop/gallery/', blank=True, null=True)
    image_url     = models.URLField(blank=True)
    display_order = models.PositiveSmallIntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'created_at']

    def get_url(self):
        if self.image:
            return self.image.url
        return self.image_url or ''

    def to_dict(self):
        return {
            'id':            self.id,
            'url':           self.get_url(),
            'display_order': self.display_order,
        }


class Order(models.Model):
    product       = models.ForeignKey(
        Product, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='orders'
    )
    product_name  = models.CharField(max_length=200, blank=True,
                                     help_text='Snapshot in case product is deleted')

    variant_size  = models.CharField(max_length=50, blank=True)
    variant_color = models.CharField(max_length=50, blank=True)
    quantity      = models.PositiveSmallIntegerField(default=1)

    full_name     = models.CharField(max_length=150)
    email         = models.EmailField()
    phone         = models.CharField(max_length=30)
    wilaya        = models.CharField(max_length=3, choices=WILAYA_CHOICES, blank=True)
    address       = models.TextField(blank=True)

    status        = models.CharField(
        max_length=20, choices=ORDER_STATUS_CHOICES, default='pending'
    )
    notes         = models.TextField(blank=True, help_text='Staff notes')
    submitted_at  = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Order #{self.id} — {self.full_name} ({self.status})"

    def to_dict(self):
        wilaya_label = dict(WILAYA_CHOICES).get(self.wilaya, self.wilaya)
        return {
            'id':             self.id,
            'product_id':     self.product_id,
            'product_name':   self.product.name if self.product else self.product_name,
            'product_banner': self.product.get_banner() if self.product else '',
            'variant_size':   self.variant_size,
            'variant_color':  self.variant_color,
            'quantity':       self.quantity,
            'full_name':      self.full_name,
            'email':          self.email,
            'phone':          self.phone,
            'wilaya':         self.wilaya,
            'wilaya_label':   wilaya_label,
            'address':        self.address,
            'status':         self.status,
            'notes':          self.notes,
            'submitted_at':   self.submitted_at.isoformat(),
        }