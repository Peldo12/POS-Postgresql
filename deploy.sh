#!/bin/bash

set -e

echo "==> Open folder project"
cd /opt/POS-Postgresql

# echo "==> Mengambil update dari GitHub"
# git pull origin main

# echo "==> Install dependency"
# npm ci

# echo "==> Restart service"
# sudo systemctl restart pos-api

echo "==> File checking !!!"

if [[ ! -f package.json ]]
then
  echo 'package.json not found'
  exit 1
fi

if [[ ! -f .env ]]
then
  echo '.env not found'
  exit 1
fi

if [[ ! -d node_modules ]]
then
  echo 'node_modules not found'
  echo 'running npm ci'
  npm ci
fi

echo "==> checking Dockerfile !!!"
if [[ ! -f Dockerfile ]]
then
  echo "Dockerfile not found"
  exit 1
fi

if [[ ! -f docker-compose.yaml ]]
then
  echo "docker-compose.yaml not found"
  exit 1
fi

echo "==> Compose up"
docker compose up --build -d
  
echo "==> Wait API ready"
until curl -sf http://localhost:3000/api/health > /dev/null
do
    sleep 1
done

echo "==> Check health API"
curl http://localhost:3000/api/health

echo
echo "==> Deploy successful"
