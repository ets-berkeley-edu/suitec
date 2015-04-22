#!/bin/sh

# The directory where forever logs should be sent to
LOG_DIR=/home/app_collabosphere/log

# Start the app server
./node_modules/.bin/forever -a -l "$LOG_DIR/forever.log" -i "$LOG_DIR/forever_app.log" -e "$LOG_DIR/forever_app.log" -m 10 start app.js
