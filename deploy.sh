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

set_status() {
  STATUS="${1-}"
  REASON="${2-}"
}

restore_version() {

  log "Restore APP_VERSION to $OLD_VERSION image"
  
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
    log "Rollback health-check failed !!"
    return 1
  fi
}

error_handler() {
    local exit_code=$?

    trap - ERR

    log "Deployment failed"
    log "Failed at: $STEP"

    rollback || true

    exit "$exit_code"
}
trap error_handler ERR

finish_up() {
  if $PRUNE_IMAGE; then
    log "Prune image ..."
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
  set_status "FAILED" "No version given, exit !!"
  exit 1
fi

if ! OLD_VERSION=$(awk -F= '/^APP_VERSION/ {print $2}' .env); then
  set_status "FAILED" "APP_VERSION not found in .env"
  exit 1
fi
CURRENT_VERSION="$OLD_VERSION"

if ! set_version "$NEW_VERSION"; then
  set_status "FAILED" "Failed to update APP_VERSION"
  exit 1
fi

log "Target version: $NEW_VERSION"

log "Backup database ..."
STEP="Backup database"
run_backup

log "Compose ... "
log "Pull image ... "
STEP="Pull image"
docker compose pull

if ! start_compose; then
  log "Deployment $NEW_VERSION image failed !!"
  
  if rollback; then
    set_status "ROLLBACK" "Deployment failed, Restored $OLD_VERSION"
  else
    set_status "FAILED" "Failed to rollback version $OLD_VERSION"
  fi
  
  exit 1
fi

if ! wait_health; then
  log "Health check failed"

  if rollback; then
    set_status "ROLLBACK" "Health-check failed, Restored $OLD_VERSION"
  else
    set_status "FAILED" "Rollback failed after health check failure"
  fi
  exit 1
fi
CURRENT_VERSION="$NEW_VERSION"
PRUNE_IMAGE=true
set_status "SUCCESS" "Deployment successful"