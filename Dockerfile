# Stage 1: fetch the two browser libraries as plain files (no bundler, no build of our code).
FROM node:24-alpine AS vendor
WORKDIR /src
COPY scripts/vendor.sh scripts/vendor.sh
RUN sh scripts/vendor.sh /src/vendor

# Stage 2: a small static server that also answers `/` for health checks.
FROM python:3.13-slim
WORKDIR /app
COPY server.py ./
COPY public ./public
COPY tests ./tests
COPY --from=vendor /src/vendor ./public/vendor
ENV PORT=8080 PYTHONUNBUFFERED=1
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/' % os.environ.get('PORT','8080'), timeout=2)"
CMD ["python", "server.py"]
