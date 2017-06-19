#!/bin/sh

# Abort immediately if a command fails
set -e

echo_usage() {
  echo "SYNOPSIS"
  echo "     ${0} <version>"; echo
  echo "DESCRIPTION"
  echo "     Sets package.json \"version\" property for SuiteC base configuration and all SuiteC"
  echo "     modules. The version may be specified in any format understood by npm-version"
  echo "     (https://docs.npmjs.com/cli/version)."; echo
  echo "ENVIRONMENT VARIABLES"
  echo "     SUITEC_BASE_DIR"
  echo "          Base directory of SuiteC deployment"; echo
  echo "EXAMPLES"
  echo "     # Bump to next major version"
  echo "          ${0} major"
  echo "     # Bump to next minor version"
  echo "          ${0} minor"  
  echo "     # Bump to next patch version"
  echo "          ${0} patch"
  echo "     # Bump to manually specified version"
  echo "          ${0} 1.13.2"
}

# Give script synopsis when no version is provided
if [ "${1}" = "" ]; then echo_usage; exit 1; fi

# Base directory of SuiteC deployment
"$(dirname ${0})/verify-suitec-base-dir.sh"

cd "${SUITEC_BASE_DIR}"

package_dirs=($SUITEC_BASE_DIR ${SUITEC_BASE_DIR}/node_modules/col-*)
for dir in "${package_dirs[@]}"; do
  echo "Bumping ${dir}/package.json"
  cd $dir && npm --no-git-tag-version version $1
done

exit 0
