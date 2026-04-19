from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('matches', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='rival_logo',
            field=models.ImageField(
                blank=True, null=True,
                upload_to='matches/logos/',
                help_text='Upload rival team logo',
            ),
        ),
        migrations.AddField(
            model_name='match',
            name='rival_logo_url',
            field=models.URLField(
                blank=True,
                help_text='External rival logo URL fallback',
            ),
        ),
    ]