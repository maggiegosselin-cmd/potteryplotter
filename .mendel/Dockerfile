# The files that, when changed, mean this file should be written again.
# depends-on:

# This application keeps no durable state on any server. Its pots live in the
# user's own browser (IndexedDB, opened by Dexie in src/lib/db.js), which no
# deployment can connect to, and Dexie upgrades that schema itself, in the
# browser, from db.version(...). The only server process (server/server.js)
# serves static files and reads just PORT. So there is no database to select,
# no connection mechanism to copy, and no migration tooling to run here.
# Nothing is read from the environment or from the repository's files; the
# stages copy only .mendel/phase/phase.sh, which .dockerignore does not exclude.

FROM alpine:3.24 AS migrate
# Serves nothing: no port, no listener. Prints one line and exits 0.
CMD ["echo", "This application has no persistent stores to migrate."]

FROM migrate AS adapter
COPY .mendel/phase/phase.sh /mendel/phase
RUN chmod 0755 /mendel/phase
