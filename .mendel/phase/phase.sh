#!/bin/sh
# /mendel/phase: reports the persistent stores this application has, and
# implements the sandbox and production steps for them.
#
# This application keeps no durable state on any server: pots live in the
# user's own browser (IndexedDB via Dexie), which no deployment can reach, and
# the server only serves static files. So there is nothing to find, nothing to
# connect to, and nothing to build a sandbox from.

if [ "$#" -eq 1 ] && [ "$1" = "probe" ]; then
  printf '{"stores": []}\n'
  exit 0
fi

echo "phase: '$*' is not implemented: this application has no persistent stores" >&2
exit 2
