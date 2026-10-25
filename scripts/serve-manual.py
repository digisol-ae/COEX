#!/usr/bin/env python3
"""Serve only the local manual and referenced Markdown, never .env/source/private files."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parent.parent

class ManualHandler(SimpleHTTPRequestHandler):
    def allowed(self):
        raw = unquote(urlsplit(self.path).path)
        target = (ROOT / raw.lstrip('/')).resolve()
        if raw == '/':
            return True
        if not target.is_relative_to(ROOT):
            return False
        relative = target.relative_to(ROOT)
        parts = relative.parts
        if parts[:2] == ('docs', 'manual'):
            return target.suffix.lower() in {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.csv', '.md'} or target == ROOT / 'docs/manual'
        return bool(parts and parts[0] in {'docs', 'ai', 'deploy'} and target.suffix.lower() == '.md' and target.is_file())

    def do_GET(self):
        if self.path == '/':
            self.send_response(302)
            self.send_header('Location', '/docs/manual/')
            self.end_headers()
            return
        if not self.allowed():
            self.send_error(403, 'Only manual assets and documentation are served.')
            return
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed():
            self.send_error(403)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(403, 'Directory listing is disabled.')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=3188)
    args = parser.parse_args()
    handler = partial(ManualHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
    print(f'Manual: http://localhost:{args.port}/docs/manual/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
