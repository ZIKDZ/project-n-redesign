import re

import django.core.validators
from django.db import migrations, models


def normalize_phone_numbers(apps, schema_editor):
    """
    Best-effort cleanup of existing free-text phone values so they fit the
    new max_length=10 column before the AlterField below is applied.

    - Strips everything but digits.
    - Collapses a +213 / 00213 country-code prefix down to a leading 0.
    - Truncates to 10 characters as a last resort so the column alter
      below never fails; numbers that don't end up matching the
      05/06/07 + 8-digit pattern will still save (validators aren't
      enforced at the DB level) but should be reviewed manually in the
      admin afterwards.
    """
    Order = apps.get_model('shop', 'Order')
    for order in Order.objects.exclude(phone=''):
        digits = re.sub(r'\D', '', order.phone or '')
        if digits.startswith('00213'):
            digits = '0' + digits[5:]
        elif digits.startswith('213'):
            digits = '0' + digits[3:]
        digits = digits[:10]
        if digits != order.phone:
            order.phone = digits
            order.save(update_fields=['phone'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0011_alter_order_wilaya_choices'),
    ]

    operations = [
        migrations.RunPython(normalize_phone_numbers, noop_reverse),
        migrations.AlterField(
            model_name='order',
            name='phone',
            field=models.CharField(
                max_length=10,
                validators=[
                    django.core.validators.RegexValidator(
                        message=(
                            "Enter a valid Algerian mobile number, e.g. 0659108203 "
                            "(must start with 05, 06, or 07 and contain 10 digits total)."
                        ),
                        regex='^0[567]\\d{8}$',
                    )
                ],
            ),
        ),
    ]
