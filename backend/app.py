from __future__ import annotations

import json
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from services.ai_engine import analyze_measurement
from storage import (
    clear_measurements,
    delete_measurement,
    init_db,
    list_measurements,
    save_measurement,
)


HOST = "0.0.0.0"
PORT = 6789


class QMedHandler(BaseHTTPRequestHandler):
    server_version = "QMedBackend/1.0"

    def do_OPTIONS(self) -> None:
        self._send_empty(204)

    def do_GET(self) -> None:
        path = urlparse(self.path).path

        if path == "/health":
            self._send_json({"ok": True, "service": "q-med-backend"})
            return

        if path == "/api/measurements":
            self._send_json({"data": list_measurements()})
            return

        self._send_json({"error": "Not found"}, status=404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        body = self._read_json()

        if path == "/api/ai/analyze":
            measurement_type = str(body.get("type", ""))
            try:
                result = analyze_measurement(measurement_type, body)
            except ValueError as error:
                self._send_json({"error": str(error)}, status=400)
                return

            result["id"] = body.get("id") or f"measure-{uuid.uuid4().hex[:12]}"
            save_measurement(result)
            self._send_json({"data": result}, status=201)
            return

        if path == "/api/measurements":
            try:
                record = _normalize_measurement(body)
            except KeyError as error:
                self._send_json({"error": f"Missing field: {error.args[0]}"}, status=400)
                return

            save_measurement(record)
            self._send_json({"data": record}, status=201)
            return

        if path == "/api/qbot/messages":
            message = str(body.get("message", ""))
            self._send_json({"data": {"reply": build_qbot_reply(message)}})
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

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}

        raw = self.rfile.read(length).decode("utf-8")
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

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


def _normalize_measurement(body: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(body.get("id") or f"measure-{uuid.uuid4().hex[:12]}"),
        "type": body["type"],
        "status": body["status"],
        "measuredAt": body["measuredAt"],
        "duration": body.get("duration"),
        "primaryLabel": body["primaryLabel"],
        "primaryValue": body["primaryValue"],
        "primaryUnit": body.get("primaryUnit"),
        "note": body.get("note"),
        "metrics": body.get("metrics", []),
    }


def build_qbot_reply(message: str) -> str:
    lower = message.lower()
    records = list_measurements()
    latest = records[0] if records else None

    if not message.strip():
        return "Anh hãy nhập câu hỏi để Q-Bot hỗ trợ nhé."

    if "history" in lower or "lich su" in lower or "lịch sử" in lower:
        if not records:
            return "Hiện chưa có lịch sử đo trên backend. Anh hãy đo thử một chỉ số trước."
        return f"Backend đang lưu {len(records)} kết quả. Kết quả mới nhất là {latest['type']} lúc {latest['measuredAt']}."

    if "stress" in lower or "căng thẳng" in lower:
        return "Stress screen ước tính mức căng thẳng từ tín hiệu sinh học. Khi có model thật, backend sẽ thay phần demo bằng inference."

    if "huyết áp" in lower or "blood" in lower or "pressure" in lower:
        return "Blood Pressure screen trả về systolic, diastolic và pulse. Kết quả hiện là demo, chưa dùng để chẩn đoán y tế."

    if "tim" in lower or "heart" in lower or "heartbeat" in lower:
        return "Heartbeat screen theo dõi nhịp tim và độ tin cậy tín hiệu. Anh nên đo ở nơi đủ sáng và giữ yên camera."

    if "rppg" in lower or "camera" in lower:
        return "Face rPPG dùng camera RGB để đọc thay đổi màu rất nhỏ trên da, từ đó ước tính nhịp tim và HRV."

    return "Q-Bot backend đã nhận câu hỏi. Hiện em có thể hỗ trợ về Face rPPG, Stress, Blood Pressure, Heartbeat và lịch sử đo."


def main() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), QMedHandler)
    print(f"Q-Med backend running at http://localhost:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
