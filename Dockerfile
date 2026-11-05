FROM node:24-alpine

WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY test ./test

ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:${PORT}/healthz || exit 1

USER node
CMD ["node", "server.js"]
