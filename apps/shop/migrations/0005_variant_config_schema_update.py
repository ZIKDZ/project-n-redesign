from django.db import migrations


def forward(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')

    for product in Product.objects.all():
        config = product.variant_config or {}

        old_variants = config.get("variants", [])
        new_variants = []
        attributes_set = set()

        counter = 1

        for v in old_variants:
            values = v.get("values", {}) or {}
            stock = v.get("stock", 0)

            for attr_name, attr_value in values.items():
                if not attr_value:
                    continue

                attributes_set.add(attr_name)

                new_variants.append({
                    "id": f"var_{counter}",
                    "attribute": attr_name,
                    "value": attr_value,
                    "stock": stock,
                })
                counter += 1

        product.variant_config = {
            "attributes": [{"name": name} for name in attributes_set],
            "variants": new_variants
        }

        product.save()


def backward(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')

    for product in Product.objects.all():
        config = product.variant_config or {}

        grouped = {}

        for v in config.get("variants", []):
            attr = v.get("attribute")
            val = v.get("value")
            stock = v.get("stock", 0)

            key = stock

            grouped.setdefault(key, {"values": {}, "stock": stock})
            grouped[key]["values"][attr] = val

        new_variants = []
        for i, g in enumerate(grouped.values(), start=1):
            new_variants.append({
                "id": f"var_{i}",
                "values": g["values"],
                "stock": g["stock"],
            })

        product.variant_config = {
            "attributes": [],
            "variants": new_variants
        }

        product.save()


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0004_variant_refactor'),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]