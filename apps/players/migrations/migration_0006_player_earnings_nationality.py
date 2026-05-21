from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add earnings (DecimalField) and nationality (CharField) to Player.
    """

    dependencies = [
        ('players', '0005_playerclip'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='earnings',
            field=models.DecimalField(
                max_digits=12,
                decimal_places=2,
                null=True,
                blank=True,
                help_text='Total tournament / competitive earnings in DZD (or USD — your choice)',
            ),
        ),
        migrations.AddField(
            model_name='player',
            name='nationality',
            field=models.CharField(
                max_length=100,
                blank=True,
                default='',
                help_text='Player nationality, e.g. Algerian',
            ),
            preserve_default=False,
        ),
    ]
