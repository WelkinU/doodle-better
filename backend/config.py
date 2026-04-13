"""Configuration loader for Doodle Better."""

import socket
from pathlib import Path
from typing import Any

import yaml

_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_CONFIG_PATH = _PROJECT_ROOT / "config.yaml"


def _load_raw() -> dict[str, Any]:
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _resolve_host(host_value: str) -> str:
    if host_value.lower() == "auto":
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "0.0.0.0"
    return host_value


class Config:
    def __init__(self) -> None:
        raw = _load_raw()
        server = raw.get("server", {})
        self.host: str = _resolve_host(server.get("host", "localhost"))
        self.raw_host: str = server.get("host", "localhost")
        self.port: int = int(server.get("port", 8000))

        db = raw.get("database", {})
        db_path = db.get("path", "data/doodle_better.db")
        self.db_path: Path = _PROJECT_ROOT / db_path

        tz = raw.get("timezone", {})
        self.timezone: str = tz.get("tz", "America/New_York")

        polls = raw.get("polls", {})
        self.weekly_reset_day: str = polls.get("weekly_reset_day", "Sunday")
        self.weekly_reset_hour: int = int(polls.get("weekly_reset_hour", 12))

        admin = raw.get("admin", {})
        self.admin_ip_allowlist: list[str] = admin.get("ip_allowlist", ["127.0.0.1", "::1", "localhost"])

        bl = raw.get("blacklists", {})
        self.ip_blacklist: list[str] = bl.get("ip_blacklist", [])
        self.username_blacklist: list[str] = bl.get("username_blacklist", [])

        fe = raw.get("frontend", {})
        self.frontend_dev_port: int = int(fe.get("dev_port", 5173))

        self.default_events: list[dict] = raw.get("default_events", [])


config = Config()
