from django.db import migrations, models


def migrate_variants_forward(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')
    Order = apps.get_model('shop', 'Order')

    # --- Convert Product.variants → variant_config ---
    for product in Product.objects.all():
        old_variants = getattr(product, 'variants', []) or []

        attributes = {}
        new_variants = []

        for i, v in enumerate(old_variants):
            size = v.get('size')
            color = v.get('color')

            if size:
                attributes.setdefault('Size', set()).add(size)
            if color:
                attributes.setdefault('Color', set()).add(color)

            new_variants.append({
                "id": f"var_{i+1}",
                "values": {
                    "Size": size,
                    "Color": color,
                },
                "stock": v.get('stock', 0),
            })

        product.variant_config = {
            "attributes": [
                {"name": name, "type": "select", "values": list(values)}
                for name, values in attributes.items()
            ],
            "variants": new_variants
        }

        product.save()

    # --- Convert Order variant fields ---
    for order in Order.objects.all():
        values = {}
        if getattr(order, 'variant_size', None):
            values["Size"] = order.variant_size
        if getattr(order, 'variant_color', None):
            values["Color"] = order.variant_color

        order.variant_values = values
        order.save()


def migrate_variants_backward(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')
    Order = apps.get_model('shop', 'Order')

    # Reverse Product
    for product in Product.objects.all():
        config = product.variant_config or {}
        new_variants = []

        for v in config.get('variants', []):
            values = v.get('values', {})
            new_variants.append({
                "size": values.get("Size"),
                "color": values.get("Color"),
                "stock": v.get("stock", 0),
            })

        product.variants = new_variants
        product.save()

    # Reverse Order
    for order in Order.objects.all():
        values = order.variant_values or {}
        order.variant_size = values.get("Size", "")
        order.variant_color = values.get("Color", "")
        order.save()


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0003_add_custom_fields'),
    ]

    operations = [
        # 1. Add new fields
        migrations.AddField(
            model_name='product',
            name='variant_config',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Dynamic variant attributes and combinations',
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='variant_values',
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text='Selected variant attribute values',
            ),
        ),

        # 2. Migrate data
        migrations.RunPython(migrate_variants_forward, migrate_variants_backward),

        # 3. Remove old fields
        migrations.RemoveField(
            model_name='product',
            name='variants',
        ),
        migrations.RemoveField(
            model_name='order',
            name='variant_size',
        ),
        migrations.RemoveField(
            model_name='order',
            name='variant_color',
        ),
    ]