#!/bin/sh
#
# The start script for collabosphere. This needs to go into /home/app_collabosphere/init.d/
# It's assumed that this will always be executed by the app_collabosphere user

# Change directory to where collabosphere should've been installed
cd ~/collabosphere

# Start up the app server
./deploy/start.sh
