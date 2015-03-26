#!/bin/bash

# TODO
DOCUMENT_ROOT=$1

# TODO
TARGET_REMOTE=${REMOTE:-origin}
TARGET_BRANCH=${BRANCH:-master}

# TODO
git reset --hard HEAD

# TODO
git fetch $TARGET_REMOTE
git fetch -t $TARGET_REMOTE
git checkout -b tmp
git branch -D $TARGET_BRANCH
git checkout -b $TARGET_BRANCH $TARGET_REMOTE/$TARGET_BRANCH
git branch -D tmp

# TODO
find node_modules/ -mindepth 1 -maxdepth 1 ! -name 'col-*' -exec rm -rf {} +
npm install -d

# TODO
rm -rf public/lib
node_modules/.bin/bower install

#- kill existing process
killall node

#- copy over static files
cp -R public/* $DOCUMENT_ROOT

#- start new process
node app.js &