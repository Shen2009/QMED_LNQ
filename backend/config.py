from __future__ import annotations

import os


APP_NAME = "q-med-backend"
APP_VERSION = "1.1.0"
HOST = os.getenv("QMED_HOST", "0.0.0.0")
PORT = int(os.getenv("QMED_PORT", "6789"))
MAX_JSON_BYTES = int(os.getenv("QMED_MAX_JSON_BYTES", str(2 * 1024 * 1024)))
