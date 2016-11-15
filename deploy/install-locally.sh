#!/bin/bash

# No git-reset here: we do NOT destroy local work.

# Fail the entire script when one of the commands in it fails
set -e

log() {
  echo; echo "${1}"; echo
}

log "Local install of SuiteC is starting."

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

log "We are done. Use separate scripts to stop/start the application."

exit 0
