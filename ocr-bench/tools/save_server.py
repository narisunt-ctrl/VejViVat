"""Tiny localhost-only helper: serves ocr-bench/ and saves rendered synthetic labels.

Run from ocr-bench/:  python tools/save_server.py   then open http://127.0.0.1:8765/tools/render_synthetic.html
Only writes into data/synthetic/images/ and only accepts plain file names.
"""

import base64
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "synthetic" / "images"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def do_POST(self):
        if self.path != "/save":
            self.send_error(404)
            return
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        name = body["name"]
        if not re.fullmatch(r"[a-z0-9_]+\.jpg", name):
            self.send_error(400, "bad name")
            return
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / name).write_bytes(base64.b64decode(body["dataUrl"].split(",", 1)[1]))
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
