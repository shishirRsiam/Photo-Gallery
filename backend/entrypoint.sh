#!/bin/sh
set -e

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  sleep 1
done
echo "PostgreSQL is up!"

python manage.py migrate

# Optional: collectstatic if you use it later
# python manage.py collectstatic --noinput

python manage.py runserver 0.0.0.0:8000
