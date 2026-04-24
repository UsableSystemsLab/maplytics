#!/bin/bash
set -e

cd /var/www/maplytics.org

git pull origin main

docker compose --env-file .env.prod -f docker-compose-prod.yml down

docker compose \
  --env-file .env.prod \
  -f docker-compose-prod.yml \
  up -d --build

docker image prune -f