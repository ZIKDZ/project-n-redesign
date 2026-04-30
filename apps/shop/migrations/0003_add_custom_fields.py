from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0002_add_track_stock'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='custom_fields',
            field=models.JSONField(
                default=list,
                blank=True,
                help_text='Extra text inputs shown to the customer at order time (e.g. back name, number)',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='custom_field_values',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Customer answers to the product custom fields',
            ),
        ),
    ]