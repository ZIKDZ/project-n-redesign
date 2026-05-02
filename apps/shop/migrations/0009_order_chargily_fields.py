from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0008_add_order_pricing_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='chargily_checkout_id',
            field=models.CharField(
                max_length=200,
                blank=True,
                help_text='Chargily checkout entity ID',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='chargily_checkout_url',
            field=models.URLField(
                blank=True,
                help_text='Redirect URL for the Chargily payment page',
            ),
        ),
    ]