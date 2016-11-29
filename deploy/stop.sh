#!/bin/sh

# The directory where forever logs should be sent to
LOG_DIR=~/log

# Go to base SuiteC directory
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Stop the app server
./node_modules/.bin/forever -a -l "$LOG_DIR/forever.log" -i "$LOG_DIR/forever_app.log" -e "$LOG_DIR/forever_app.log" -m 10 stopall
