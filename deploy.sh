#!/bin/bash

set -Eeuo pipefail

log() {
  echo "==> $1"
}

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

start_compose() {
  log "Start container ..."
  docker compose up -d
}

rollback_compose() {
  log "Restarting with $OLD_VERSION image"
  start_compose
}

wait_health() {
  local COUNT=0
  local MAX_RETRY=30
  until curl -sf http://localhost/api/health > /dev/null
  do
    (( COUNT++ ))
    log "Waiting API ... ($COUNT/$MAX_RETRY)"
    if (( COUNT >= MAX_RETRY )); then
      log "API failed to become healthy after $MAX_RETRY attempts"
      return 1
    fi
    sleep 1
  done
  log "API is healthy"
}

rollback() {
  restore_version

  if ! rollback_compose; then
    log "Rollback run failed !!"
    exit 1
  fi

  wait_health
}

finish_up() {
  log "Prune image"
  docker image prune -f
  
  log "Deploy version: $NEW_VERSION"
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

if ! start_compose; then
  log "Deployment failed !!"
  rollback
  exit 1
fi

if ! wait_health; then
  log "Health check failed"

  rollback

  log "Rollback success"
  exit 1
fi
  
finish_up