#!/bin/bash

set -e

echo "==> Masuk ke folder project"
cd /opt/Test-NGINX

echo "==> Mengambil update dari GitHub"
git pull origin main

echo "==> Install dependency"
npm ci

echo "==> Restart service"
sudo systemctl restart pos-api

echo "==> Tunggu API siap"
until curl -sf http://localhost:3000/api/health > /dev/null
do
    sleep 1
done

echo "==> Cek health API"
curl http://localhost:3000/api/health

echo
echo "==> Deploy selesai"
