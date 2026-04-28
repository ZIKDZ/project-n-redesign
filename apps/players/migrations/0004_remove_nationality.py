from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('players', '0003_player_clips_socials'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE players_player ALTER COLUMN nationality DROP NOT NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]