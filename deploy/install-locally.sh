#!/bin/bash

# This script does NOT git-reset; do NOT destroy local work.

# Fail the entire script when one of the commands in it fails
set -e

log() {
  echo; echo "${1}"; echo
}

log "Local install of SuiteC is starting.

NOTE: We will copy SuiteC static files to DOCUMENT_ROOT (env variable) location, presumably an Apache directory."

[[ "${DOCUMENT_ROOT}" ]] || { echo "[ERROR] 'DOCUMENT_ROOT' is undefined"; echo; exit 1; }

# Go to base SuiteC directory
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Remove third-party node_modules and re-install npm dependencies
find node_modules/ -mindepth 1 -maxdepth 1 ! -name 'col-*' -exec rm -rf {} +
npm install

log "Remove existing bower dependencies and re-install"
rm -rf public/lib
node_modules/.bin/bower install

log "Run gulp build"
node_modules/.bin/gulp build

log "Copy SuiteC static files to Apache directory: ${DOCUMENT_ROOT}"

cp -R target/* "${DOCUMENT_ROOT}"

log "We are done. Use separate scripts to stop/start the application."

exit 0
