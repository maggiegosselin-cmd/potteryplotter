# The files that, when changed, mean this file should be written again.
# depends-on:

# This repository has no application code and keeps no durable state, so there
# is no database to select, no connection mechanism to copy, and no migration
# tooling to run. Nothing is read from the environment or from any file.

FROM alpine:3.24 AS migrate
# Serves nothing: no port, no listener. Prints one line and exits 0.
CMD ["echo", "This application has no persistent stores to migrate."]

FROM migrate AS adapter
COPY .mendel/phase/phase.sh /mendel/phase
RUN chmod 0755 /mendel/phase
