"""Static file server for the offline pot log.

The app itself runs on the phone: records and photos live in the phone's own
IndexedDB, so this server only hands out the app's files. It writes one line of
JSON per request, and one more per unhandled error, to standard output.
"""
import hashlib
import json
import mimetypes
import os
import sys
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(ROOT, "public")
BUILD_PLACEHOLDER = "__BUILD__"

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/manifest+json", ".webmanifest")

# Tests swap this for an in-memory stream.
log_out = sys.stdout


def emit(record):
    """Write one JSON log line now, not at exit."""
    log_out.write(json.dumps(record, separators=(",", ":")) + "\n")
    log_out.flush()


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + ".%03dZ" % (time.time() % 1 * 1000)


def public_files():
    """Every file under public/, as sorted paths relative to it."""
    found = []
    for folder, _dirs, names in os.walk(PUBLIC):
        for name in names:
            found.append(os.path.relpath(os.path.join(folder, name), PUBLIC))
    return sorted(found)


def build_id():
    """A short hash of the app's files; the service worker's cache is named after it.

    Any change to a shipped file gives a new cache, so phones pick up updates.
    """
    digest = hashlib.sha256()
    for rel in public_files():
        if rel == "sw.js":
            continue
        digest.update(rel.encode())
        with open(os.path.join(PUBLIC, rel), "rb") as f:
            digest.update(f.read())
    return digest.hexdigest()[:12]


def resolve(url_path):
    """Map a URL path to a file under public/, or None."""
    rel = unquote(url_path).lstrip("/") or "index.html"
    full = os.path.realpath(os.path.join(PUBLIC, rel))
    if not full.startswith(os.path.realpath(PUBLIC) + os.sep):
        return None
    return full if os.path.isfile(full) else None


def read_body(full):
    """The bytes to send for a file; the service worker gets its build id."""
    with open(full, "rb") as f:
        body = f.read()
    if os.path.basename(full) == "sw.js" and os.path.dirname(full) == os.path.realpath(PUBLIC):
        body = body.replace(BUILD_PLACEHOLDER.encode(), build_id().encode())
    return body


def serve_file(url_path):
    """Return (status, content_type, body) for a GET of url_path."""
    full = resolve(url_path)
    if full is None:
        return 404, "text/plain; charset=utf-8", b"Not found\n"
    ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
    if ctype.startswith("text/") or ctype.endswith("json"):
        ctype += "; charset=utf-8"
    return 200, ctype, read_body(full)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "potlog"

    def log_message(self, *args):  # replaced by the JSON line in _handle
        pass

    def send_response(self, code, message=None):
        self._status = code
        super().send_response(code, message)

    def do_GET(self):
        self._handle(send_body=True)

    def do_HEAD(self):
        self._handle(send_body=False)

    def _handle(self, send_body):
        started = time.time()
        self._status = 0
        request_id = self.headers.get("X-Request-Id") or uuid.uuid4().hex
        path = urlsplit(self.path).path
        try:
            status, ctype, body = serve_file(path)
            self._reply(status, ctype, body, request_id, send_body)
        except Exception as exc:  # unhandled: log it, answer 500
            emit({
                "time": now_iso(), "level": "error", "msg": "unhandled error",
                "request_id": request_id, "method": self.command, "path": path,
                "error": str(exc), "stack": traceback.format_exc(),
            })
            if not self._status:
                self._reply(500, "text/plain; charset=utf-8", b"Something went wrong\n",
                            request_id, send_body)
        emit({
            "time": now_iso(), "level": "info", "msg": "request",
            "request_id": request_id, "method": self.command, "path": path,
            "status": self._status,
            "duration_ms": round((time.time() - started) * 1000, 2),
        })

    def _reply(self, status, ctype, body, request_id, send_body):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # The service worker does the caching; the browser must always ask it.
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Request-Id", request_id)
        self.end_headers()
        if send_body:
            self.wfile.write(body)


def make_server(port, host="0.0.0.0"):
    return ThreadingHTTPServer((host, port), Handler)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    emit({"time": now_iso(), "level": "info", "msg": "listening", "port": port})
    make_server(port).serve_forever()
