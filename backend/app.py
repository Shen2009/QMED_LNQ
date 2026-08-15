from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from config import APP_NAME, APP_VERSION, HOST, MAX_JSON_BYTES, PORT
from services.ai_engine import analyze_measurement
from services.qbot_service import build_qbot_reply
from storage import (
    clear_measurements,
    delete_measurement,
    get_measurement,
    init_db,
    list_measurements,
    measurement_summary,
    save_measurement,
)
from validators import ValidationError, normalize_measurement, normalize_positive_int


class QMedHandler(BaseHTTPRequestHandler):
    server_version = f"QMedBackend/{APP_VERSION}"

    def do_OPTIONS(self) -> None:
        self._send_empty(204)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/health":
            self._send_json(
                {
                    "ok": True,
                    "service": APP_NAME,
                    "version": APP_VERSION,
                    "storage": "sqlite",
                    "aiEngine": "demo",
                }
            )
            return

        if path == "/api/measurements":
            limit = normalize_positive_int(_first(query, "limit"), default=100, maximum=500)
            measurement_type = _first(query, "type")
            self._send_json({"data": list_measurements(measurement_type, limit)})
            return

        if path == "/api/measurements/summary":
            self._send_json({"data": measurement_summary()})
            return

        prefix = "/api/measurements/"
        if path.startswith(prefix):
            record_id = unquote(path[len(prefix):])
            record = get_measurement(record_id)
            if not record:
                self._send_json({"error": "Measurement not found"}, status=404)
                return
            self._send_json({"data": record})
            return

        self._send_json({"error": "Not found"}, status=404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        body, error = self._read_json()
        if error:
            self._send_json({"error": error}, status=400)
            return

        if path == "/api/ai/analyze":
            measurement_type = str(body.get("type", ""))
            try:
                result = analyze_measurement(measurement_type, body)
            except ValueError as error:
                self._send_json({"error": str(error)}, status=400)
                return

            try:
                record = normalize_measurement({**result, "id": body.get("id")})
            except ValidationError as error:
                self._send_json({"error": str(error)}, status=400)
                return

            save_measurement(record)
            self._send_json({"data": record}, status=201)
            return

        if path == "/api/measurements":
            try:
                record = normalize_measurement(body)
            except ValidationError as error:
                self._send_json({"error": str(error)}, status=400)
                return

            save_measurement(record)
            self._send_json({"data": record}, status=201)
            return

        if path == "/api/qbot/messages":
            message = str(body.get("message", ""))
            records = list_measurements(limit=20)
            self._send_json({"data": {"reply": build_qbot_reply(message, records)}})
            return

        self._send_json({"error": "Not found"}, status=404)

    def do_DELETE(self) -> None:
        path = urlparse(self.path).path

        if path == "/api/measurements":
            clear_measurements()
            self._send_empty(204)
            return

        prefix = "/api/measurements/"
        if path.startswith(prefix):
            record_id = path[len(prefix):]
            deleted = delete_measurement(record_id)
            self._send_json({"deleted": deleted}, status=200 if deleted else 404)
            return

        self._send_json({"error": "Not found"}, status=404)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"{self.address_string()} - {self.command} {self.path} - {format % args}")

    def _read_json(self) -> tuple[dict[str, Any], str | None]:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}, None

        if length > MAX_JSON_BYTES:
            return {}, "Request body is too large"

        raw = self.rfile.read(length).decode("utf-8")
        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                return {}, "JSON body must be an object"
            return parsed, None
        except json.JSONDecodeError:
            return {}, "Invalid JSON body"

    def _send_empty(self, status: int) -> None:
        self.send_response(status)
        self._send_cors_headers()
        self.end_headers()

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")


def _first(query: dict[str, list[str]], key: str) -> str | None:
    values = query.get(key)
    return values[0] if values else None


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), QMedHandler)
    print(f"Q-Med backend {APP_VERSION} running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
