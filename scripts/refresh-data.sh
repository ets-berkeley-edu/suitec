#!/bin/bash

# Fail the entire script when an individual command fails.
set -e

echo_usage() {
  echo "SYNOPSIS"
  echo "     ${0} dest_suitec"; echo
  echo "ARGUMENTS"
  echo "     dest_suitec    The short name (e.g., 'suitec-dev', 'suitec-qa') of the SuiteC instance to"
  echo "                    which data should be migrated. An appropriately named json config file must"
  echo "                    exist under the local SuiteC base directory (e.g., 'config/suitec-dev.json')."
}

# Insist on a dest_suitec argument.
dest_suitec=$1
[[ "${dest_suitec}" ]] || {
  echo_usage
  exit 1
}

"$(dirname ${0})/verify-suitec-base-dir.sh"

# Verify that a production.json config file exists for the source connection.
[[ -f "${SUITEC_BASE_DIR}/config/production.json" ]] || {
  echo "[ERROR] production.json config file not found."; echo
  echo_usage
  exit 1
}

# Verify that a JSON config file exists for the destination connection.
[[ -f "${SUITEC_BASE_DIR}/config/${dest_suitec}.json" ]] || {
  echo "[ERROR] ${dest_suitec}.json config file not found."; echo
  echo_usage
  exit 1
}

# Parse source connection info.
source_host=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/production.json').db.host || '')"`
source_port=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/production.json').db.port || '')"`
source_db=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/production.json').db.database || '')"`
source_user=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/production.json').db.username || '')"`
source_password=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/production.json').db.password || '')"`

# Parse destination connection info.
dest_host=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').db.host || '')"`
dest_port=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').db.port || '')"`
dest_db=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').db.database || '')"`
dest_user=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').db.username || '')"`
dest_password=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').db.password || '')"`

# Validate parsed connection info.
[[ "${source_host}" && "${source_port}" && "${source_db}" && "${source_user}" && "${source_password}" ]] || {
  echo "[ERROR] Complete source database connection information not found in local production.json."; echo
  echo_usage
  exit 1
}

[[ "${dest_host}" && "${dest_port}" && "${dest_db}" && "${dest_user}" && "${dest_password}" ]] || {
  echo "[ERROR] Complete destination database connection information not found in ${dest_suitec}.json."; echo
  echo_usage
  exit 1
}

# Tell the shell environment where to find psql.
export PATH=${PATH}:/opt/postgres94/bin

echo "Connecting to ${source_db} at ${source_host}:${source_port}..."

# Config files for non-production destinations (suitec-dev, suitec-qa) will include a canvas.host value
# identifying the Canvas environment to which they're usually connected.
dest_canvas=`node -e "console.log(require('${SUITEC_BASE_DIR}/config/${dest_suitec}.json').canvas.host)"`

# If we have a dest_canvas value, we will migrate only bcourses.berkeley.edu SuiteC data, replacing that
# hostname with the destination Canvas hostname.
if [[ "${dest_canvas}" ]]; then
  source_canvas='bcourses.berkeley.edu'
  "$(dirname ${0})/pull-data.sh" "-d ${source_host}:${source_port}:${source_db}:${source_user}:${source_password}" "-c" "${source_canvas}" "-r" "${dest_canvas}"

# If we have no dest_canvas value, our destination is a production environment. In that case, we pull data for
# all Canvas instances and perform no transformation; we also pull the 'canvas' table.
else
  "$(dirname ${0})/pull-data.sh" "-d ${source_host}:${source_port}:${source_db}:${source_user}:${source_password}" "-a"
fi

echo "Connecting to ${dest_db} at ${dest_host}:${dest_port}..."

# When pushing to a non-production environment, inactivate all courses after push.
if [[ "${dest_canvas}" ]]; then
  "$(dirname ${0})/push-data.sh" "-d ${dest_host}:${dest_port}:${dest_db}:${dest_user}:${dest_password}" "-i"

# When pushing to a production environment, include the 'canvas' table.
else
  "$(dirname ${0})/push-data.sh" "-d ${dest_host}:${dest_port}:${dest_db}:${dest_user}:${dest_password}" "-a"
fi

echo "Removing temporary csv files..."
rm ./*.csv

echo "Data refresh complete."

exit 0
