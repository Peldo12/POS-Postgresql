#!/bin/bash

set -Eeuo pipefail

# Config
PROJECT_DIR="/opt/POS-Postgresql"
IMAGE="-"
IMAGE_REPO="kholi12/pos-api"
MISSING=-

# Stage
# ---------
STAGE_INIT="Init"
STAGE_VERSION="Version"
STAGE_ENGINE="Engine"
STAGE_FILECHECK="File Check"
STAGE_AUTH="Registry Auth"
STAGE_TAG="Check Tag"
STAGE_BUILD="Build"
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

version_check() {
  log "Check given version ..."

  if [[ -z "$1" ]]; then
    set_status "FAILED" "No version given, exit !!"
    exit 1
  fi

  CURRENT_VERSION="$1"
  IMAGE="$IMAGE_REPO:$NEW_VERSION"
}

file_check() {
  log "File checking ..."

  if [[ ! -f Dockerfile ]]; then
    MISSING="Dockerfile"
    exit 1
  fi
  
  if [[ ! -f package.json && ! -f package-lock.json ]]; then
    MISSING="package's"
    exit 1
  fi
}

registry_auth_check() {
  log "Checking registry authentication ..."

  if ! docker info | grep -q "Username"; then
    set_status "FAILED" "Docker registry not authenticated"
    exit 1
  fi

  log "Registry authenticated"
}

tag_check() {
  log "Checking image tag $IMAGE ..."

  if docker manifest inspect "$IMAGE" >/dev/null 2>&1; then
    set_status "FAILED" "Image tag already exists"
    log "Image already exists"
    exit 1
  fi

  log "Tag available"
}

build_image() {
  log "Building image $IMAGE ..."

  docker build \
    --label "version=$NEW_VERSION" \
    --label "build_date=$(date -u)" \
    -t "$IMAGE" .
  
  log "Image build successfully"
}

push_image() {
  log "Push image $IMAGE ..."

  docker push "$IMAGE"

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

finish_up() {
  log "Build version: ${CURRENT_VERSION-}"
  log "Status: ${STATUS-}"
  log "Stage: ${CURRENT_STAGE-}"
  log "Reason: ${REASON-}"
}

cleanup() {
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

# ===============
# Main
# ===============

log "Build starting ..."

run_stage "$STAGE_ENGINE" docker info >/dev/null

run_stage "$STAGE_AUTH" registry_auth_check

run_stage "$STAGE_VERSION" version_check "$NEW_VERSION"

run_stage "$STAGE_FILECHECK" file_check

run_stage "$STAGE_TAG" tag_check

run_stage "$STAGE_BUILD" build_image

run_stage "$STAGE_PUSH" push_image

CURRENT_STAGE="Done"
set_status "SUCCESS" "Image pushed successfully" 
