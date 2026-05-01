# shop/migrations/0006_order_updates.py

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0005_variant_config_schema_update'),
    ]

    operations = [
        # make email optional
        migrations.AlterField(
            model_name='order',
            name='email',
            field=models.EmailField(blank=True, max_length=254),
        ),

        # add baladiya field
        migrations.AddField(
            model_name='order',
            name='baladiya',
            field=models.CharField(max_length=100, blank=True),
        ),

        # update wilaya choices
        migrations.AlterField(
            model_name='order',
            name='wilaya',
            field=models.CharField(
                max_length=3,
                blank=True,
                choices=[
                    ('01', 'Adrar'),
                    ('02', 'Chlef'),
                    ('03', 'Laghouat'),
                    ('04', 'Oum El Bouaghi'),
                    ('05', 'Batna'),
                    ('06', 'Béjaïa'),
                    ('07', 'Biskra'),
                    ('08', 'Béchar'),
                    ('09', 'Blida'),
                    ('10', 'Bouira'),
                    ('11', 'Tamanrasset'),
                    ('12', 'Tébessa'),
                    ('13', 'Tlemcen'),
                    ('14', 'Tiaret'),
                    ('15', 'Tizi Ouzou'),
                    ('16', 'Alger'),
                    ('17', 'Djelfa'),
                    ('18', 'Jijel'),
                    ('19', 'Sétif'),
                    ('20', 'Saïda'),
                    ('21', 'Skikda'),
                    ('22', 'Sidi Bel Abbès'),
                    ('23', 'Annaba'),
                    ('24', 'Guelma'),
                    ('25', 'Constantine'),
                    ('26', 'Médéa'),
                    ('27', 'Mostaganem'),
                    ('28', "M'Sila"),
                    ('29', 'Mascara'),
                    ('30', 'Ouargla'),
                    ('31', 'Oran'),
                    ('32', 'El Bayadh'),
                    ('33', 'Illizi'),
                    ('34', 'Bordj Bou Arréridj'),
                    ('35', 'Boumerdès'),
                    ('36', 'El Tarf'),
                    ('37', 'Tindouf'),
                    ('38', 'Tissemsilt'),
                    ('39', 'El Oued'),
                    ('40', 'Khenchela'),
                    ('41', 'Souk Ahras'),
                    ('42', 'Tipaza'),
                    ('43', 'Mila'),
                    ('44', 'Aïn Defla'),
                    ('45', 'Naâma'),
                    ('46', 'Aïn Témouchent'),
                    ('47', 'Ghardaïa'),
                    ('48', 'Relizane'),
                    ('49', 'Timimoun'),
                    ('50', 'Bordj Badji Mokhtar'),
                    ('51', 'Ouled Djellal'),
                    ('52', 'Béni Abbès'),
                    ('53', 'In Salah'),
                    ('54', 'In Guezzam'),
                    ('55', 'Touggourt'),
                    ('56', 'Djanet'),
                    ('57', "El M'Ghair"),
                    ('58', 'El Meniaa'),
                    ('59', 'Aflou'),
                    ('60', 'Barika'),
                    ('61', 'El Kantara'),
                    ('62', 'Bir El Ater'),
                    ('63', 'El Abiodh Sidi Cheikh'),
                    ('64', 'Ksar Chellala'),
                    ('65', 'Ain Ouessara'),
                    ('66', "M'Sila"),
                    ('67', 'Ksar El Boukhari'),
                    ('68', 'Bou Saâda'),
                    ('69', 'El Abiodh Sidi Cheikh'),
                ],
            ),
        ),
    ]