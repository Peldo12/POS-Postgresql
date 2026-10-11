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

  CONTAINER_ID=$(docker compose ps -q backend)

  while (( COUNT < MAX_RETRY ))
  do
    STATUS_HEALTH=$(docker inspect \
      --format='{{.State.Health.Status}}' \
      "$CONTAINER_ID")

    if [[ -z "$STATUS_HEALTH" ]]; then
      log "Container has no healthcheck"
      return 1
    fi
    
    case "$STATUS_HEALTH" in
      healthy)
        log "API is healthy"
        return 0
        ;;

      unhealthy)
        log "API is unhealthy"
        return 1
        ;;

      starting)
        ((COUNT++))
        log "Waiting API ... ($COUNT/$MAX_RETRY)"
        ;;

      *)
        log "Unknown status: $STATUS_HEALTH"
        return 1
        ;;
    esac

    sleep 1
  done

  return 1
}

verify_rollback() {
  wait_health
}

rollback() {
  log "Failed to deploy $NEW_VERSION image, Restore $OLD_VERSION"
  restore_version

  start_compose

  verify_rollback
}

deploy_and_verify() {
    start_compose
    wait_health
}

error_handler() {
    local code=$?

    trap - ERR

    log "Deployment failed"
    log "Function: ${FUNCNAME[1]}"
    log "Line: ${BASH_LINENO[0]}"
    log "Failed command: $BASH_COMMAND"
    log "Exit code: $code"
    case "$CURRENT_STAGE" in
      Init)
        log "Failed to open project folder"
        ;;
        
      Backup)
        log "Failed to backup database"
        ;;
        
      Pull)
        log "Failed to pull, $NEW_VERSION image not found"
        ;;
        
      Deploy)
        log "Failed to deploy $NEW_VERSION image"
        ;;
        
      Health)
        log "Deployment failed to be healthy"
        ;;
        
      *)
        log "No rollback needed"
        ;;
    esac

    rollback || true

    set_status "ROLLBACK" "Deployment failed, Restore $OLD_VERSION"

    exit "$code"
}
trap error_handler ERR

finish_up() {
  if $PRUNE_IMAGE; then
    log "Prune image ..."
    docker image prune -f
  fi
  
  log "Deploy version: ${CURRENT_VERSION-}"
  log "Status: ${STATUS-}"
  log "Stage: ${CURRENT_STAGE-}"
  log "Reason: ${REASON-}"
}
trap finish_up EXIT

# ========
# main run
# ========

log "Open folder project"
CURRENT_STAGE="Init"
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

CURRENT_STAGE="Backup"
run_backup

CURRENT_STAGE="Pull"
docker compose pull

CURRENT_STAGE="Deploy"
start_compose

CURRENT_STAGE="Health"
wait_health

CURRENT_VERSION="$NEW_VERSION"
PRUNE_IMAGE=true
set_status "SUCCESS" "Deployment successful"