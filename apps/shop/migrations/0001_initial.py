from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(max_digits=10, decimal_places=2)),
                ('category', models.CharField(
                    max_length=50,
                    choices=[('jersey','Jersey'),('hoodie','Hoodie'),('cap','Cap'),('accessory','Accessory'),('other','Other')],
                    default='jersey',
                )),
                ('banner', models.ImageField(blank=True, null=True, upload_to='shop/banners/')),
                ('banner_url', models.URLField(blank=True)),
                ('variants', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('is_featured', models.BooleanField(default=False)),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['display_order', '-created_at']},
        ),
        migrations.CreateModel(
            name='ProductImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(blank=True, null=True, upload_to='shop/gallery/')),
                ('image_url', models.URLField(blank=True)),
                ('display_order', models.PositiveSmallIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='images',
                    to='shop.product',
                )),
            ],
            options={'ordering': ['display_order', 'created_at']},
        ),
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('product_name', models.CharField(max_length=200, blank=True)),
                ('variant_size', models.CharField(max_length=50, blank=True)),
                ('variant_color', models.CharField(max_length=50, blank=True)),
                ('quantity', models.PositiveSmallIntegerField(default=1)),
                ('full_name', models.CharField(max_length=150)),
                ('email', models.EmailField()),
                ('phone', models.CharField(max_length=30)),
                ('wilaya', models.CharField(max_length=3, blank=True)),
                ('address', models.TextField(blank=True)),
                ('status', models.CharField(
                    max_length=20,
                    choices=[('pending','Pending'),('confirmed','Confirmed'),('shipped','Shipped'),('delivered','Delivered'),('cancelled','Cancelled')],
                    default='pending',
                )),
                ('notes', models.TextField(blank=True)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='orders',
                    to='shop.product',
                )),
            ],
            options={'ordering': ['-submitted_at']},
        ),
    ]
