#!/bin/bash

set -Eeuo pipefail

PRUNE_IMAGE=false
STATUS="FAILED"
REASON="Unexpected error"

# ===============
# function inline
# ===============

log() {
  echo "==> $1"
}

set_version() {
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$1/" .env
}

caller() {
  STATUS="${1-}"
  REASON="${2-}"
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

  log "Restarting with $OLD_VERSION image"
  if ! start_compose; then
    log "Rollback run failed !!"
    return 1
  fi

  if ! wait_health; then
    log "Rollback health check failed !!"
    return 1
  fi
}

finish_up() {
  log "Prune image ..."
  if $PRUNE_IMAGE; then
    docker image prune -f
  fi
  
  log "Deploy version: ${CURRENT_VERSION-}"
  log "Status: ${STATUS-}"
  log "Reason: ${REASON-}"
}
trap finish_up EXIT

# ========
# main run
# ========

log "Open folder project"
cd /opt/POS-Postgresql

if [[ -z "${1-}" ]]; then
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
CURRENT_VERSION="$OLD_VERSION"

if ! set_version "$NEW_VERSION"; then
  log "Failed to update APP_VERSION"
  caller "FAILED" "Failed to update env"
  exit 1
fi

log "Target version: $NEW_VERSION"

log "Backup Database ..."
if ! run_backup; then
  log "Database backup failed !!"
  caller "FAILED" "Database backup failed"
  exit 1
fi

log "Compose ... "
log "Pull image ... "
if ! docker compose pull ; then
  log "Pull failed !!"
  restore_version
  caller "FAILED" "Failed to pull, $NEW_VERSION image not found !!"
  exit 1
fi

if ! start_compose; then
  log "Deployment $NEW_VERSION image failed !!"
  
  if ! rollback; then
    log "Automatic rollback failed !!"
    caller "ROLLBACK" "Failed to rollback version $OLD_VERSION"
  fi
  
  exit 1
fi

if ! wait_health; then
  log "Health check failed"

  if rollback; then
    log "Rollback success"
  else
    log "Automatic rollback failed !!"
  fi
  exit 1
fi
CURRENT_VERSION="$NEW_VERSION"
caller "SUCCESS" "ALL GOOD"