#!/bin/bash

# Fail the entire script when one of the commands in it fails
set -e

# Go to base directory of local git repo
cd $(dirname "${BASH_SOURCE[0]}")/..
base_directory="${PWD}"

# The important steps are recorded in time-stamped log file
logger="tee -a $(date +"${base_directory}/logs/deploy_%Y-%m-%d-%H%M%S.log")"

echo_usage() {
  echo; echo "USAGE"; echo "  ${0} [-r remote] [-b branch] [-t tag]"; echo
  echo "Deploy the latest SuiteC code from a specified branch or tag."; echo
  echo "Set environment variable DOCUMENT_ROOT to the Apache directory which will serve SuiteC static files."; echo
  echo "Common usages:"; echo
  echo "   # Deploy Arthur's branch"
  echo "   ${0} -r arthur_guinness -b irish_dry_stout"; echo
  echo "   # Deploy qa branch using default remote (origin)"
  echo "   ${0} -b qa"; echo
  echo "   # Deploy tag 1.6"
  echo "   ${0} -t 1.6"; echo
}

log() {
  echo | ${logger}
  echo "${1}" | ${logger}
  echo | ${logger}
}

# If we have missing requirements then echo usage info and exit.
[[ $# -gt 0 ]] || { echo_usage; exit 0; }
[[ "${DOCUMENT_ROOT}" ]] || { echo; echo "[ERROR] 'DOCUMENT_ROOT' is undefined"; echo_usage; exit 1; }

# Default remote repository
git_remote="origin"

while getopts "b:r:t:" arg; do
  case ${arg} in
    b)
      git_branch="${OPTARG}"
      ;;
    r)
      git_remote="${OPTARG}"
      ;;
    t)
      git_tag="${OPTARG}"
      ;;
  esac
done

# Validation
[[ "${git_tag}" || "${git_branch}" ]] || { log "[ERROR] You must specify branch or tag."; echo_usage; exit 1; }
[[ "${git_tag}" && "${git_branch}" ]] && { log "[ERROR] Specify branch or tag but NOT both."; echo_usage; exit 1; }

echo; echo "WARNING! In two seconds we will clear local changes with git reset. Control-c to abort."
sleep 2.5

log "Deploy SuiteC with command: ${0} ${*}"

# Clear local changes
git reset --hard HEAD

# Check out the branch or tag. If a tag is being deployed, the git HEAD will point to a commit and
# will end up in a "detached" state. As we shouldn't be committing on deployed code, this is considered OK

# Learn about remote branches
git fetch ${git_remote}

if [[ "${git_branch}" ]] ; then
  local_branch_name=$(date +"deploy-${git_remote}/${git_branch}_%Y-%m-%d-%H%M%S")
  log "git checkout branch: ${git_branch}"
  # Delete the local copy of the target branch (if any) as the upstream branch might have been rebased
  git rev-parse --verify ${git_branch} > /dev/null 2>&1 && git branch -D ${git_branch}
  log "Begin Git checkout of remote branch: ${git_remote}/${git_branch}"
  git checkout ${git_remote}/${git_branch} || { log "[ERROR] Unknown Git branch: ${git_branch}"; exit 1; }
else
  local_branch_name=$(date +"deploy-tags/${git_tag}_%Y-%m-%d-%H%M%S")
  log "git checkout tag: ${git_tag}"
  # Learn about remote tags
  git fetch -t ${git_remote}
  git checkout tags/${git_tag} || { log "[ERROR] Unknown Git tag: ${git_tag}"; exit 1; }
fi

# Create tmp branch
log "Create a local, temporary Git branch: ${local_branch_name}"
git checkout -b "${local_branch_name}"

log "The Git checkout is complete. Now remove the existing node_modules and re-install all npm dependencies"

# npm install
find node_modules/ -mindepth 1 -maxdepth 1 ! -name 'col-*' -exec rm -rf {} +
npm install contextify@0.1.14
npm install

log "Remove the existing bower dependencies and re-install"
rm -rf public/lib
node_modules/.bin/bower install

log "Run gulp build"
node_modules/.bin/gulp build

log "Kill the existing SuiteC process"
./deploy/stop.sh

log "Copy SuiteC static files to Apache directory: ${DOCUMENT_ROOT}"
cp -R target/* "${DOCUMENT_ROOT}"

log "Start a new and improved SuiteC process."
./deploy/start.sh

log "We are done. Time to smoke-test the application."
exit 0
