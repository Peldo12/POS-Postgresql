#!/bin/bash

set -Eeuo pipefail

# Config
TIMESTAMP="$(date +%H:%M:%S)"
USERNAME="$(docker system info | grep Username)"

log() {
  echo "==> $TIMESTAMP UTC: $1"
}

log "File chekhing ..."

if [[ ! -f Dockerfile ]]; then
  log "Dockerfile not found !!"
  exit 1
fi

if [[ ! -f package.json && ! -f package-lock.json ]]; then
  log "package is missing !!"
  exit 1
fi

log "Build starting ..."
if [[ -z "$1" ]]; then
  read -p "==> Input version : " NEW_VERSION
else
  NEW_VERSION="$1"
fi

if [[ -z "$NEW_VERSION" ]]; then
  log "No version given, exit !!"
  exit 1
fi

log "Building image ..."

if ! docker build . -t kholi12/pos-api:"$NEW_VERSION"; then
  log "Failed building image !!"
  exit 1
else
  log "Image $NEW_VERSION has been build"
fi

log "Push image ..."
if ! docker push kholi12/pos-api:"$NEW_VERSION"; then
  log "Failed push image !!"
  exit 1
else
  log "Image $NEW_VERSION has successfully pushed"
fi

log "Development ended"
log "New version: $NEW_VERSION"