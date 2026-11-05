#!/bin/sh
# /mendel/phase: reports the persistent stores this application has, and
# implements the sandbox and production steps for them.
#
# This repository holds no application code and keeps no durable state: no
# database, no persistent volume, no external store of record. So there is
# nothing to find, nothing to connect to, and nothing to build a sandbox from.

if [ "$#" -eq 1 ] && [ "$1" = "probe" ]; then
  printf '{"stores": []}\n'
  exit 0
fi

echo "phase: '$*' is not implemented: this application has no persistent stores" >&2
exit 2
