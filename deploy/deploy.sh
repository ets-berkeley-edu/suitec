#!/bin/bash

# Script that deploys the latest Collabosphere code from
# a specified remote and branch. The `DOCUMENT_ROOT` environment
# variable should be set to the directory in which the static
# need to be deployed
#
#  usage: $ deploy/deploy.sh

# Fail the entire script when one of the commands in it fails
set -e

# Get the remote and branch that should be
# deployed from the provided environment variables
TARGET_REMOTE=${REMOTE:-origin}
TARGET_BRANCH=${BRANCH:-master}

# Clear any local changes present in the branch
git reset --hard HEAD

# Work on a temporary branch
git checkout -b tmp

# Get all the branches and tags from the remote
git fetch $TARGET_REMOTE
git fetch -t $TARGET_REMOTE

# Delete the local copy of the target branch (if any) as the upstream branch might have been rebased
git rev-parse --verify $TARGET_BRANCH > /dev/null 2>&1 && git branch -D $TARGET_BRANCH

# Check out the branch or tag. If a tag is being deployed, the git HEAD will point to a commit and
# will end up in a "detached" state. As we shouldn't be committing on deployed code, this is considered OK
git checkout $TARGET_REMOTE/$TARGET_BRANCH
git branch -D tmp

# Remove the existing node_modules and re-install
# all npm dependencies
find node_modules/ -mindepth 1 -maxdepth 1 ! -name 'col-*' -exec rm -rf {} +
npm install contextify@0.1.14
npm install

# Remove the existing bower dependencies and
# re-install
rm -rf public/lib
node_modules/.bin/bower install

# Run the production build
node_modules/.bin/gulp build

# Kill the existing node process
./deploy/stop.sh

# Copy the static files over to the apache directory
cp -R target/* ${DOCUMENT_ROOT}

# Start the new node process
./deploy/start.sh
