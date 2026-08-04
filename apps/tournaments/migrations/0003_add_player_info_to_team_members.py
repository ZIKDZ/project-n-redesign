from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0002_match_double_elim_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournamentteammember',
            name='full_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='tournamentteammember',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name='tournamentteammember',
            name='in_game_tag',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]