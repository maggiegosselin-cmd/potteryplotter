# The files that, when changed, mean this file should be written again.
# depends-on: server/store.js server/server.js Dockerfile

# The migrate stage applies db/migrations (dbmate) to the SQLite database the
# application keeps. The database is chosen the way the application's own image
# chooses it (see /Dockerfile and server/server.js): the DATABASE_PATH variable,
# with the same default value the application image bakes in. Nothing else.
FROM node:22-alpine AS migrate
WORKDIR /app
# dbmate is the migration tool (a single static binary).
COPY --from=ghcr.io/amacneil/dbmate:2.37.0 /usr/local/bin/dbmate /usr/local/bin/dbmate
# Copied from the repository's Dockerfile.
ENV DATABASE_PATH=/data/potlog.db
COPY db/migrations/ ./db/migrations/
COPY .mendel/phase/migrate.js /mendel/migrate.js
CMD ["node", "/mendel/migrate.js"]

# Adds /mendel/phase, which reports and rehearses against the same database.
FROM migrate AS adapter
COPY .mendel/phase/phase.js /mendel/phase
RUN chmod 0755 /mendel/phase
