#!/bin/sh
#
# The start script for collabosphere. This needs to go into /home/app_collabosphere/init.d/

# Change directory to where collabosphere should've been installed
cd /home/app_collabosphere/collabosphere

# Start up the app server
./deploy/start.sh
