from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0009_order_chargily_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='payment_method',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('cod',     'Cash on Delivery'),
                    ('online',  'CIB / eDahabia (Chargily)'),
                    ('both',    'Both — customer chooses'),
                ],
                default='online',
                help_text=(
                    'Controls how the customer pays for this product. '
                    '"cod" skips Chargily entirely; "online" forces card payment; '
                    '"both" lets the customer pick at checkout.'
                ),
            ),
        ),
    ]
