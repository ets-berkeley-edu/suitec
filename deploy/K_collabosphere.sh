#!/bin/sh
#
# The stop script for collabosphere. This needs to go into /home/app_collabosphere/init.d/
# It's assumed that this will always be executed by the app_collabosphere user

# Change directory to where collabosphere should've been installed
cd ~/collabosphere

# Stop the app server
./deploy/stop.sh
