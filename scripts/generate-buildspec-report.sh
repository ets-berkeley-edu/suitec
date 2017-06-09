#!/bin/sh

# Abort immediately if a command fails
set -e

cat << EOF > "${PWD}/config/buildspec-report.json"
{
  "git": {
    "branch": "$(git rev-parse --abbrev-ref HEAD)",
    "commit": "$(git log --pretty=format:'%H' -n 1)"
  }
}
EOF

exit 0
