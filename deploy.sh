#!/bin/bash
set -e

cd /var/www/html/maplytics.org

git pull origin main

docker compose -f docker-compose-prod.yml down

docker compose \
  --env-file .env.prod \
  -f docker-compose-prod.yml \
  up -d --build

docker image prune -f

sudo systemctl reload nginx