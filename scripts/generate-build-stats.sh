#!/bin/sh

# Abort immediately if a command fails
set -e

cat << EOF > "${PWD}/config/build-stats.json"
{
  "build": {
    "artifact": "${CODEBUILD_SOURCE_VERSION}",
    "gitCommit": "${CODEBUILD_RESOLVED_SOURCE_VERSION}"
  }
}
EOF

exit 0
