#!/bin/bash

# Script that deploys the latest Collabosphere code from
# a specified remote and branch. The `DOCUMENT_ROOT` environment
# variable should be set to the directory in which the static
# need to be deployed
#
#  usage: $ deploy/deploy.sh

# Get the remote and branch that should be
# deployed from the provided environment variables
TARGET_REMOTE=${REMOTE:-origin}
TARGET_BRANCH=${BRANCH:-master}

# Clear any local changes present in the branch
git reset --hard HEAD

# Check out the requested remove and branch
git fetch $TARGET_REMOTE
git fetch -t $TARGET_REMOTE
git checkout -b tmp
git branch -D $TARGET_BRANCH
git checkout -b $TARGET_BRANCH $TARGET_REMOTE/$TARGET_BRANCH
git branch -D tmp

# Remove the existing node_modules and re-install
# all npm dependencies
find node_modules/ -mindepth 1 -maxdepth 1 ! -name 'col-*' -exec rm -rf {} +
npm install

# Remove the existing bower dependencies and
# re-install
rm -rf public/lib
node_modules/.bin/bower install

# Kill the existing node process
./deploy/stop.sh

# Copy the static files over to the apache directory
cp -R public/* ${DOCUMENT_ROOT}

# Start the new node process
./deploy/start.sh
