#!/bin/bash

# TODO
DOCUMENT_ROOT=$1

# TODO
TARGET_REMOTE=${REMOTE:-origin}
TARGET_BRANCH=${BRANCH:-master}

# TODO
git reset --hard HEAD

# TODO
git fetch $TARGET_REMOTE \
  || { echo 'FAILED to fetch the requested remote'; exit 1; }
git fetch -t $TARGET_REMOTE \
  || { echo 'FAILED to fetch the tags from the requested remote'; exit 1; }
git checkout -B $TARGET_BRANCH \
  || { echo 'FAILED to move to the requested branch/tag'; exit 1; }
git pull $TARGET_REMOTE $TARGET_BRANCH \
  || { echo 'FAILED to pull the latest changes from the requested branch/tag'; exit 1; }

# TODO
rm -rf node_modules/!(col-*)
npm install

# TODO
node_module/.bin/bower install

#- kill existing process
killall node

#- copy over static files
cp -R public/* $DOCUMENT_ROOT

#- start new process
node app.js &