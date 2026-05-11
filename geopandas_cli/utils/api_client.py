import os
import requests
from .errors import LocationResolutionError


class ApiClient:
    """Thin HTTP wrapper around api_server endpoints used by the worker."""

    def __init__(self, base_url=None, worker_key=None, timeout=10):
        self.base_url = base_url or os.environ.get("API_URL", "http://api_server:4000/api")
        self.worker_key = worker_key or os.environ.get("WORKER_API_KEY", "")
        self.timeout = timeout

    def _headers(self):
        return {
            "x-worker-key": self.worker_key,
            "Content-Type": "application/json",
        }

    def resolve_locations(self, names):
        """Calls GET /locations/resolve. Returns dict { level, matches } or raises."""
        if len(names) != 2:
            raise ValueError("resolve_locations requires exactly two names")
        url = f"{self.base_url}/locations/resolve"
        params = {"names": ",".join(names)}
        resp = requests.get(url, params=params, headers=self._headers(), timeout=self.timeout)
        if resp.status_code == 422:
            raise LocationResolutionError(resp.json().get("details", {}))
        resp.raise_for_status()
        return resp.json()
