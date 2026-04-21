release: /app/.venv/bin/python manage.py migrate --noinput
web: /app/.venv/bin/gunicorn config.wsgi --workers 2 --threads 2 --timeout 60 --bind 0.0.0.0:$PORT