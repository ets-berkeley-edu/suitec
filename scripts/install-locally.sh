#!/bin/bash

# Fail the entire script when one of the commands in it fails
set -e

echo_usage() {
  echo "SYNOPSIS"
  echo "     ${0}"; echo
  echo "ENVIRONMENT VARIABLES"; echo
  echo "     DOCUMENT_ROOT"
  echo "          Apache directory to which we copy SuiteC static files"; echo
  echo "     SUITEC_BASE_DIR"
  echo "          Base directory of SuiteC deployment"; echo
}

"$(dirname ${0})/verify-suitec-base-dir.sh"

[[ "${DOCUMENT_ROOT}" ]] || { echo; echo "[ERROR] 'DOCUMENT_ROOT' is undefined"; echo_usage; exit 1; }

log() {
  echo "${1}"; echo
}

log "Local install of SuiteC is starting."

cd "${SUITEC_BASE_DIR}"
find node_modules/ -mindepth 1 -maxdepth 1 -not -name 'col-*' -exec /bin/rm -rf '{}' \+

log "NPM clean and install"
npm cache clean
npm install

log "Remove existing bower dependencies and re-install"
rm -rf public/lib
node_modules/.bin/bower cache clean
node_modules/.bin/bower install

log "Run gulp build"
node_modules/.bin/gulp build

log "We are done. Use separate scripts to stop/start the application."

exit 0
