#!/bin/bash

set -Eeuo pipefail

log() {
  text="$1"
  for ((i=0; i<${#text}; i++)); do
    echo -ne "\e[5;32m${text:$i:1}\e[0m"
    sleep 0.015
  done
  echo ""
}

log "Open folder project"
cd /opt/POS-Postgresql

if [[ -z "$1" ]]; then
  read -p "==> Input version : " NEW_VERSION
else
  NEW_VERSION="$1"
fi

if [[ -z "$NEW_VERSION" ]]; then
  log "No version given, exit !!"
  exit 1
fi

if ! OLD_VERSION=$(awk -F= '/^APP_VERSION/ {print $2}' .env); then
  log "APP_VERSION not found in .env"
  exit 1
fi

set_version() {
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env
}

restore_version() {
  log "Restore APP_VERSION to $OLD_VERSION"

  if ! set_version "$OLD_VERSION"; then
    log "Failed to restore APP_VERSION"
    exit 1
  fi
}

run_backup() {
  sudo /usr/local/bin/pos-db-backup.sh
}

if ! set_version "$NEW_VERSION"; then
  log "Failed to update APP_VERSION"
  exit 1
fi

log "Target version: $NEW_VERSION"
log "Backup Database ..."
run_backup

log "Compose ... "
log "Pull image ... "
if ! docker compose pull ; then
  log "Pull failed !!"
  restore_version
  exit 1
fi

log "Start container ..."
if ! docker compose up -d; then
  log "Deployment failed !!"
  restore_version
  exit 1
fi

COUNT=0
MAX_RETRY=30
until curl -sf http://localhost/api/health > /dev/null
do
  (( COUNT++ ))
  log "Waiting API ... ($COUNT/$MAX_RETRY)"
  if (( COUNT >= MAX_RETRY )); then
    log "API failed to become healthy after $MAX_RETRY attempts"
    exit 1
  fi
  sleep 1
done
log "API is healthy"

log "Prune image"
docker image prune -f

log "Deploy version: $NEW_VERSION"