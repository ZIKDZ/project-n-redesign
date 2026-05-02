from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0006_order_updates'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50, unique=True)),
                ('discount_type', models.CharField(
                    max_length=10,
                    choices=[('fixed', 'Fixed Amount (DZD)'), ('percentage', 'Percentage (%)')],
                )),
                ('value', models.DecimalField(max_digits=10, decimal_places=2)),
                ('allowed_products', models.JSONField(
                    default=list,
                    blank=True,
                    help_text='List of product IDs this coupon applies to. Empty = all products.',
                )),
                ('minimum_order_amount', models.DecimalField(
                    max_digits=10, decimal_places=2, default=0,
                    help_text='Minimum cart value required to use this coupon.',
                )),
                ('expiration_date', models.DateField(
                    null=True, blank=True,
                    help_text='Coupon expires at end of this date. Leave blank for no expiry.',
                )),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
