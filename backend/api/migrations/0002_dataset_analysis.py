# Generated manually for dataset auto-analysis (demo contract)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="dataset",
            name="analysis",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Profiling output: columns, metrics, charts, insights",
            ),
        ),
    ]
