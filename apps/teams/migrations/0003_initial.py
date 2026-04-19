from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Add uploaded-file fields for banner and logo to Team.
    The existing banner_url / logo_url URL fields are kept as fallbacks.
    """

    dependencies = [
        ('teams', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='team',
            name='banner',
            field=models.ImageField(
                blank=True, null=True,
                upload_to='teams/banners/',
            ),
        ),
        migrations.AddField(
            model_name='team',
            name='logo',
            field=models.ImageField(
                blank=True, null=True,
                upload_to='teams/logos/',
            ),
        ),
    ]