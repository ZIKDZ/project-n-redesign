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

    # Variant system schema:
    # {
    #   "attributes": [
    #     {"name": "Size"},
    #     {"name": "Color"}
    #   ],
    #   "variants": [
    #     {"id": "var_123_abc", "attribute": "Size",  "value": "S",     "stock": 10},
    #     {"id": "var_124_def", "attribute": "Size",  "value": "M",     "stock": 5},
    #     {"id": "var_125_ghi", "attribute": "Color", "value": "Black", "stock": 8}
    #   ]
    # }
    variant_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Dynamic variant attributes and their individual values'
    )

    # Custom fields: [{"label": "Back Name", "placeholder": "e.g. SMITH", "required": true}, ...]
    custom_fields = models.JSONField(
        default=list,
        blank=True,
        help_text='Extra text inputs shown to the customer at order time'
    )

    track_stock   = models.BooleanField(
        default=True,
        help_text='When disabled, stock numbers are ignored'
    )

    is_active     = models.BooleanField(default=True)
    is_featured   = models.BooleanField(default=False)
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

    def get_attributes(self):
        """Return list of variant attributes."""
        return self.variant_config.get('attributes', [])

    def get_variants(self):
        """Return list of individual variant values."""
        return self.variant_config.get('variants', [])

    def total_stock(self):
        """Sum of all variant stocks."""
        if not self.track_stock:
            return None
        return sum(v.get('stock', 0) for v in self.get_variants())

    def to_dict(self):
        return {
            'id':             self.id,
            'name':           self.name,
            'description':    self.description,
            'price':          str(self.price),
            'category':       self.category,
            'banner':         self.get_banner(),
            'variant_config': self.variant_config or {},
            'custom_fields':  self.custom_fields or [],
            'track_stock':    self.track_stock,
            'total_stock':    self.total_stock(),
            'is_active':      self.is_active,
            'is_featured':    self.is_featured,
            'display_order':  self.display_order,
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
    product_name  = models.CharField(max_length=200, blank=True)

    # Variant selection: {"Size": "M", "Color": "Black"}
    variant_values = models.JSONField(
        default=dict,
        blank=True,
        help_text='Selected variant attribute values'
    )
    quantity       = models.PositiveSmallIntegerField(default=1)

    # Custom field answers: {"Back Name": "SMITH"}
    custom_field_values = models.JSONField(default=dict, blank=True)

    full_name      = models.CharField(max_length=150)
    email          = models.EmailField()
    phone          = models.CharField(max_length=30)
    wilaya         = models.CharField(max_length=3, choices=WILAYA_CHOICES, blank=True)
    address        = models.TextField(blank=True)

    status         = models.CharField(
        max_length=20, choices=ORDER_STATUS_CHOICES, default='pending'
    )
    notes          = models.TextField(blank=True)
    submitted_at   = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Order #{self.id} — {self.full_name} ({self.status})"

    def to_dict(self):
        wilaya_label = dict(WILAYA_CHOICES).get(self.wilaya, self.wilaya)
        # Format: "Size: M / Color: Black"
        variant_str = ' / '.join(
            f"{k}: {v}" for k, v in self.variant_values.items()
        ) if self.variant_values else ''
        return {
            'id':                  self.id,
            'product_id':          self.product_id,
            'product_name':        self.product.name if self.product else self.product_name,
            'product_banner':      self.product.get_banner() if self.product else '',
            'variant_values':      self.variant_values or {},
            'variant_display':     variant_str,
            'quantity':            self.quantity,
            'custom_field_values': self.custom_field_values or {},
            'full_name':           self.full_name,
            'email':               self.email,
            'phone':               self.phone,
            'wilaya':              self.wilaya,
            'wilaya_label':        wilaya_label,
            'address':             self.address,
            'status':              self.status,
            'notes':               self.notes,
            'submitted_at':        self.submitted_at.isoformat(),
        }