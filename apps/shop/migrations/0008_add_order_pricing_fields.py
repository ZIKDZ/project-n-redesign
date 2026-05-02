from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0007_add_coupons'),  # change if your last migration is different
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='coupon_code',
            field=models.CharField(
                max_length=50,
                blank=True,
                help_text='Coupon code applied at checkout, if any',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='discount_amount',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=0,
                help_text='Monetary discount applied (0 if no coupon)',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='total_amount',
            field=models.DecimalField(
                max_digits=10,
                decimal_places=2,
                default=0,
                help_text='Final amount after discount (0 means not recorded)',
            ),
        ),
    ]