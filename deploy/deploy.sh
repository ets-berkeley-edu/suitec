#!/bin/bash

# Script that deploys the latest Collabosphere code from
# a specified remote and branch
# 
#  usage: $ deploy/deploy.sh <apache_static_files_dir>

# Get the directory to which the static files
# should be deployed from the provided argument
DOCUMENT_ROOT=$1

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

# Kill the existing Node process
# TODO: Turn the Node process into a service
# that can be stopped and started
killall node

# Copy the static files over to the apache directory
cp -R public/* $DOCUMENT_ROOT

# Start the new node process
node app.js &
