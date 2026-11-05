import io
import json
import os
import re
import sys
import threading
import unittest
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402


class ServerCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.make_server(0, "127.0.0.1")
        cls.base = "http://127.0.0.1:%d" % cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def setUp(self):
        self.log = io.StringIO()
        self._saved = server.log_out
        server.log_out = self.log

    def tearDown(self):
        server.log_out = self._saved

    def get(self, path, headers=None):
        req = urllib.request.Request(self.base + path, headers=headers or {})
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.headers, resp.read()
        except urllib.error.HTTPError as err:
            return err.code, err.headers, err.read()

    def log_lines(self):
        return [json.loads(line) for line in self.log.getvalue().splitlines() if line]


class ServingTests(ServerCase):
    def test_root_is_the_app_page(self):
        status, headers, body = self.get("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", headers["Content-Type"])
        self.assertIn(b'rel="manifest"', body)
        self.assertIn(b"apple-touch-icon", body)

    def test_manifest_is_installable(self):
        status, headers, body = self.get("/manifest.webmanifest")
        self.assertEqual(status, 200)
        self.assertIn("manifest+json", headers["Content-Type"])
        manifest = json.loads(body)
        self.assertEqual(manifest["display"], "standalone")
        self.assertEqual(manifest["start_url"], "/")
        sizes = {icon["sizes"] for icon in manifest["icons"]}
        self.assertTrue({"192x192", "512x512"} <= sizes)
        for icon in manifest["icons"]:
            self.assertEqual(self.get(icon["src"])[0], 200)

    def test_modules_are_javascript(self):
        status, headers, _ = self.get("/js/app.js")
        self.assertEqual(status, 200)
        self.assertIn("text/javascript", headers["Content-Type"])

    def test_unknown_and_escaping_paths_are_404(self):
        self.assertEqual(self.get("/nope.txt")[0], 404)
        self.assertEqual(self.get("/..%2Fserver.py")[0], 404)

    def test_service_worker_gets_a_build_id(self):
        status, _, body = self.get("/sw.js")
        self.assertEqual(status, 200)
        text = body.decode()
        self.assertNotIn("__BUILD__", text)
        self.assertRegex(text, r"const BUILD = '[0-9a-f]{12}'")

    def test_service_worker_precaches_every_app_file(self):
        with open(os.path.join(ROOT, "public", "sw.js")) as f:
            source = f.read()
        listed = re.findall(r"^\s+'(/[^']*)',?$", source.split("const PRECACHE = [")[1].split("];")[0], re.M)
        self.assertIn("/", listed)
        for url in listed:
            self.assertEqual(self.get(url)[0], 200, url)
        # every script of ours is in the list, so it works offline
        for name in os.listdir(os.path.join(ROOT, "public", "js")):
            self.assertIn("/js/" + name, listed)
        self.assertIn("/vendor/dexie.mjs", listed)
        self.assertIn("/vendor/preact-htm.js", listed)

    def test_build_id_changes_with_content(self):
        before = server.build_id()
        self.assertEqual(before, server.build_id())


class LoggingTests(ServerCase):
    def test_request_line(self):
        self.get("/", {"X-Request-Id": "abc123"})
        lines = [l for l in self.log_lines() if l.get("msg") == "request"]
        self.assertEqual(len(lines), 1)
        line = lines[0]
        self.assertEqual(line["request_id"], "abc123")
        self.assertEqual(line["method"], "GET")
        self.assertEqual(line["path"], "/")
        self.assertEqual(line["status"], 200)
        self.assertIsInstance(line["duration_ms"], (int, float))
        for key in ("time", "level"):
            self.assertIn(key, line)

    def test_path_has_no_query(self):
        self.get("/styles.css?x=1")
        self.assertEqual(self.log_lines()[-1]["path"], "/styles.css")

    def test_unhandled_error_is_logged_with_stack(self):
        original = server.serve_file

        def boom(path):
            raise RuntimeError("disk on fire")

        server.serve_file = boom
        try:
            status, _, _ = self.get("/", {"X-Request-Id": "err-1"})
        finally:
            server.serve_file = original
        self.assertEqual(status, 500)
        lines = self.log_lines()
        errors = [l for l in lines if l["level"] == "error"]
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["request_id"], "err-1")
        self.assertEqual(errors[0]["error"], "disk on fire")
        self.assertIn("RuntimeError", errors[0]["stack"])
        access = [l for l in lines if l["msg"] == "request"][0]
        self.assertEqual(access["status"], 500)
        self.assertEqual(access["request_id"], "err-1")


if __name__ == "__main__":
    unittest.main()
