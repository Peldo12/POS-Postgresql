#!/bin/bash

set -e

log() {
  echo "==> $1"
}

log "File cheching ..."

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
else
  log "Image $NEW_VERSION has been build"
fi

log "Push image ..."
if ! docker push kholi12/pos-api:"$NEW_VERSION";
  log "Failed push image !!"
else;
  log "Image $NEW_VERSION has successfully pushed"
fi

log "Development ended"
log "New version: $NEW_VERSION"