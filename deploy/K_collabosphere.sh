#!/bin/sh
#
# The stop script for collabosphere. This needs to go into /home/app_collabosphere/init.d/

# Change directory to where collabosphere should've been installed
cd /home/app_collabosphere/collabosphere

# Stop the app server
./deploy/stop.sh
