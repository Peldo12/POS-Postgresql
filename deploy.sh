#!/bin/bash

set -Eeuo pipefail

# Config
# ---------
LOCK_FILE="/tmp/deploy.lock"
ENV_FILE="/etc/pos/production.env"

# Stage
# ---------
STAGE_INIT="Init"
STAGE_BACKUP="Backup"
STAGE_PULL="Pull"
STAGE_DEPLOY="Deploy"
STAGE_HEALTH="Health"

# Runtime
# ---------
init_runtime() {
  CURRENT_STAGE="$STAGE_INIT"
  CURRENT_VERSION="-"
  PRUNE_IMAGE=false
  STATUS="FAILED"
  REASON="Unexpected error"
  ROLLBACKING=false
}

# Deploy
# ---------
OLD_VERSION=-
NEW_VERSION=-

# ===============
# Utility
# ===============

log() {
  echo "==> $1"
}

set_status() {
  STATUS="${1-}"
  REASON="${2-}"
}

acquire_lock() {
  if [[ -f "$LOCK_FILE" ]]; then
    local OLD_PID=-

    OLD_PID=$(<"$LOCK_FILE")

    if kill -0 "$OLD_PID" 2>/dev/null; then
      log "Deployment is running with PID $OLD_PID"
      exit 1
    else
      log "Removing stale lock"
      rm -f "$LOCK_FILE"
    fi
  fi

  echo "$$" > "$LOCK_FILE"
}

release_lock() {
  rm -f "${LOCK_FILE-}"
}

# ===============
# Environment
# ===============

load_env() {
  [[ -f .env ]] || {
    log ".env not found"
    return 1
  }
  
  [[ -f "$ENV_FILE" ]] || {
    log "$ENV_FILE not found"
    return 1
  }

  set -a
  source .env
  source "$ENV_FILE"
  
  validate_env
}

require_env() {
  local VAR="$1"

  if [[ -z "${!VAR:-}" ]]; then
    log "$VAR is not set"
    return 1
  fi
}

validate_env() {
  local REQUIRE_ENV=(
    APP_VERSION
    SUPER_NAME
    SUPER_EMAIL
    SUPER_PASS
    DB_HOST
    DB_USER
    DB_PASSWORD
    DB_NAME
    REDIS_URL
    EMAIL_HOST
    EMAIL_PORT
    EMAIL_USER
    EMAIL_PASS
    ACCESS_SECRET
    REFRESH_SECRET
  )

  for var in "${REQUIRE_ENV[@]}"; do
    require_env "$var"
  done
}


set_version() {
  local version="$1"
  sed -i "s/^APP_VERSION=.*/APP_VERSION=$version/" .env
}

restore_version() {

  log "Restore APP_VERSION to $OLD_VERSION image"
  
  if ! set_version "$OLD_VERSION"; then
    log "Failed to restore APP_VERSION"
    exit 1
  fi
  source .env
}

# ===============
# Deployment
# ===============

run_backup() {
  sudo /usr/local/bin/pos-db-backup.sh
}

start_compose() {
  log "Start container ..."
  docker compose up -d --no-deps --force-recreate backend
}

wait_health() {
  local COUNT=0
  local MAX_RETRY=30
  local CONTAINER_ID=-
  local HEALTH_STATUS=-

  if ! CONTAINER_ID=$(docker compose ps -q backend); then
    log "Failed to get backend container id"
    return 1
  fi

  if [[ -z "$CONTAINER_ID" ]]; then
    log "Backend container not found"
    return 1
  fi

  while (( COUNT < MAX_RETRY ))
  do
    if ! HEALTH_STATUS=$(docker inspect \
      --format='{{.State.Health.Status}}' \
      "$CONTAINER_ID"); then
      log "Failed to inspect container"
      return 1
    fi

    case "$HEALTH_STATUS" in
      healthy)
        log "API is healthy"
        return 0
        ;;

      unhealthy)
        log "API is unhealthy"
        return 1
        ;;

      starting)
        ((++COUNT))
        log "Waiting API ... ($COUNT/$MAX_RETRY)"
        ;;

      *)
        log "Unknown health status: $HEALTH_STATUS"
        return 1
        ;;
    esac

    sleep 3
  done

  log "API health timeout after $MAX_RETRY attempts"
  return 1
}


rollback() {
  ROLLBACKING=true

  restore_version

  log "Rollback backend to $OLD_VERSION"

  if ! start_compose; then
    log "Rollback compose failed"
    return 1
  fi
  
  if ! wait_health; then
    log "Rollback health failed"
    return 1
  fi

  ROLLBACKING=false
  return 0
}

show_container_logs() {
  log "Last backend logs ..."

  docker compose logs --tail 50 backend || true
}

# ===============
# Helpers
# ===============

run_stage() {
  CURRENT_STAGE="$1"
  shift

  "$@"
}
# ===============
# Trap
# ===============


error_handler() {
  local code=$?

  if [[ "${ROLLBACKING-}" == true ]]; then
    log "Rollback failed"
    exit 1
  fi
  trap - ERR

  log "Error at stage: ${CURRENT_STAGE-}"
  log "Command: $BASH_COMMAND"
  log "Line: ${BASH_LINENO[0]}"

  show_container_logs
  
  case "$CURRENT_STAGE" in
    Deploy)
      if rollback; then
        set_status "ROLLBACK" "Deploy failed, restored $OLD_VERSION"
      else
        set_status "FAILED" "Rollback failed"
      fi
      ;;
  
    Health)
      if rollback; then
        set_status "ROLLBACK" "Health failed, restored $OLD_VERSION"
      else
        set_status "FAILED" "Rollback health failed"
      fi
      ;;
    Pull)
      restore_version
      set_status "FAILED" "Failed to pull image $NEW_VERSION"
      ;;
  
    *)
      set_status "FAILED" "Failed at stage $CURRENT_STAGE"
      ;;
  esac
  
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

cleanup() {
  finish_up
  release_lock
}

trap cleanup EXIT

# ===============
# Main
# ===============


log "Open folder project"

acquire_lock

cd /opt/POS-Postgresql

init_runtime
load_env

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

run_stage "$STAGE_BACKUP" run_backup

run_stage "$STAGE_PULL" docker compose pull

run_stage "$STAGE_DEPLOY" start_compose

run_stage "$STAGE_HEALTH" wait_health

CURRENT_STAGE="Done"
CURRENT_VERSION="$NEW_VERSION"
PRUNE_IMAGE=true
set_status "SUCCESS" "Deployment successful"
