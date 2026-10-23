#!/bin/bash

set -Eeuo pipefail

# Config
PROJECT_DIR="/opt/POS-Postgresql"
IMAGE="-"
IMAGE_REPO="kholi12/pos-api"
MISSING=-
COMPOSE_FILE="compose.test.yml"
SERVICE_NAME="backend-test"

# Stage
# ---------
STAGE_INIT="Init"
STAGE_VERSION="Version"
STAGE_PROJECT="Project"
STAGE_ENGINE="Engine"
STAGE_FILECHECK="File Check"
STAGE_AUTH="Registry Auth"
STAGE_TAG="Check Tag"
STAGE_BUILD="Build"
STAGE_TEST="Test"
STAGE_PUSH="Push"

# Runtime
# ---------
init_runtime() {
  CURRENT_STAGE="$STAGE_INIT"
  CURRENT_VERSION="-"
  STATUS="FAILED"
  REASON="Unexpected error"
  ROLLBACKING=false
}

# Deploy
# ---------
OLD_VERSION=-
NEW_VERSION="${1-}"

# ===============
# Utility
# ===============

log() {
  echo "==> $(date +%H:%M:%S) UTC: $1"
}

set_status() {
  STATUS="${1-}"
  REASON="${2-}"
}

# ===============
# Runtime
# ===============

project_check() {
  log "Entering project directory..."

  if [[ ! -d "$PROJECT_DIR" ]]; then
    fail "Project directory not found"
  fi

  cd "$PROJECT_DIR"
}

version_check() {
  log "Check given version ..."

  if [[ -z "$1" ]]; then
    fail "No version given, exit !!"
  fi

  CURRENT_VERSION="$1"
  IMAGE="$IMAGE_REPO:$NEW_VERSION"
}

file_check() {
  log "File checking ..."

  if [[ ! -f Dockerfile ]]; then
    MISSING="Dockerfile"
    fail "Dockerfile missing !!" 
  fi
  
  if [[ ! -f package.json ]]; then
    MISSING="package.json"
    fail "package.json missing !!" 
  fi
}

registry_auth_check() {
  log "Checking registry authentication ..."

  if ! docker info | grep -q "Username"; then
    fail "Docker registry not authenticated"
  fi

  log "Registry authenticated"
}

tag_check() {
  log "Checking image tag $IMAGE ..."

  if docker manifest inspect "$IMAGE" >/dev/null 2>&1; then
    fail "Image tag already exists"
  fi

  log "Tag available"
}

build_image() {
  log "Building image $IMAGE ..."

  if ! docker build \
    --label "version=$NEW_VERSION" \
    --label "build_date=$(date -u)" \
    -t "$IMAGE" .;then
    fail "Failure to build image" 
  fi
  
  log "Image build successfully"
}

wait_health() {
  local COUNT=0
  local MAX_RETRY=30
  local CONTAINER_ID=-
  local HEALTH_STATUS=-

  if ! CONTAINER_ID=$(docker compose -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME"); then
    log "Failed to get backend container id !!"
    return 1
  fi

  if [[ -z "$CONTAINER_ID" ]]; then
    log "Backend container not found !!"
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

test_image() {
  log "Starting compose test..."
  
  export APP_VERSION="$CURRENT_VERSION"

  if ! docker compose -f "$COMPOSE_FILE" up -d;then
    fail "Failure to start compose"
  fi

  log "Waiting backend health ..."
  if ! wait_health; then
    fail "Image health check failed"
  fi

  log "Compose test passed"
}

push_image() {
  log "Push image $IMAGE ..."

  if ! docker push "$IMAGE";then
    fail "Push image failed"
  fi

  log "Image pushed successfully"
}

# ===============
# Error Cleanup
# ===============

error_handler() {
  local code=$?
  
  trap - ERR

  log "Error at stage: ${CURRENT_STAGE-}"
  log "Command: $BASH_COMMAND"
  log "Line: ${BASH_LINENO[0]}"
  
  exit "$code"
}
trap error_handler ERR

cleanup_test() {
    if [[ -f "$PROJECT_DIR/$COMPOSE_FILE" ]]; then
        docker compose \
          -f "$PROJECT_DIR/$COMPOSE_FILE" \
          down -v >/dev/null 2>&1 || true
    fi
}

finish_up() {
  log "Build version: ${CURRENT_VERSION-}"
  log "Status: ${STATUS-}"
  log "Stage: ${CURRENT_STAGE-}"
  log "Reason: ${REASON-}"
}

cleanup() {
  cleanup_test
  finish_up
}

trap cleanup EXIT

# ===============
# Helper
# ===============

run_stage() {
  CURRENT_STAGE="$1"
  shift

  "$@"
}

fail() {
  set_status "FAILED" "$1"
  exit 1
}

# ===============
# Main
# ===============

log "Build starting ..."

run_stage "$STAGE_INIT" init_runtime

run_stage "$STAGE_ENGINE" docker info >/dev/null

run_stage "$STAGE_AUTH" registry_auth_check

run_stage "$STAGE_VERSION" version_check "$NEW_VERSION"

run_stage "$STAGE_PROJECT" project_check

run_stage "$STAGE_FILECHECK" file_check

run_stage "$STAGE_TAG" tag_check

run_stage "$STAGE_BUILD" build_image

run_stage "$STAGE_TEST" test_image

run_stage "$STAGE_PUSH" push_image

CURRENT_STAGE="Done"
set_status "SUCCESS" "Image pushed successfully" 
