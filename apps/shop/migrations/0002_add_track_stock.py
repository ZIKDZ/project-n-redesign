# shop/migrations/0002_add_track_stock.py

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='track_stock',
            field=models.BooleanField(
                default=True,
                help_text=(
                    'When disabled, stock numbers are ignored and the product '
                    'is always shown as available'
                ),
            ),
        ),
    ]