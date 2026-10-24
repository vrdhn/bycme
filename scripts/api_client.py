#!/usr/bin/env python3
"""Shared HTTP client for Bycme API testing."""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

DEFAULT_BASE_URL = "https://bycme-staging.bycme-backend.workers.dev"


class ApiResponse:
    """Encapsulates HTTP response data."""

    def __init__(self, status: int, data: Any, raw_body: str):
        self.status = status
        self.data = data
        self.raw_body = raw_body

    @property
    def ok(self) -> bool:
        """Return True if status code is 2xx."""
        return 200 <= self.status < 300


class BycmeClient:
    """HTTP client for Bycme backend."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or os.environ.get("BYCME_API_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.token: Optional[str] = None

    def set_token(self, token: Optional[str]) -> None:
        """Set bearer authentication token."""
        self.token = token

    def request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
        token: Optional[str] = None,
    ) -> ApiResponse:
        """Send HTTP request to API endpoint."""
        url = f"{self.base_url}{path}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BycmeClient/1.0",
        }

        auth_token = token if token is not None else self.token
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        data_bytes = None
        if body is not None:
            data_bytes = json.dumps(body).encode("utf-8")

        req = urllib.request.Request(
            url=url,
            data=data_bytes,
            headers=headers,
            method=method.upper(),
        )

        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                raw = resp.read().decode("utf-8")
                try:
                    parsed = json.loads(raw)
                except Exception:
                    parsed = raw
                return ApiResponse(status, parsed, raw)
        except urllib.error.HTTPError as err:
            raw = err.read().decode("utf-8")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw
            return ApiResponse(err.code, parsed, raw)
        except urllib.error.URLError as err:
            return ApiResponse(0, {"error": str(err.reason)}, str(err.reason))

    def get(self, path: str, token: Optional[str] = None) -> ApiResponse:
        """Execute GET request."""
        return self.request("GET", path, token=token)

    def post(self, path: str, body: Optional[Dict[str, Any]] = None, token: Optional[str] = None) -> ApiResponse:
        """Execute POST request."""
        return self.request("POST", path, body=body, token=token)

    def put(self, path: str, body: Optional[Dict[str, Any]] = None, token: Optional[str] = None) -> ApiResponse:
        """Execute PUT request."""
        return self.request("PUT", path, body=body, token=token)

    def login(self, email: str, password: str) -> ApiResponse:
        """Authenticate and retain session token."""
        resp = self.post("/api/auth/login", {"email": email, "password": password})
        if resp.ok and isinstance(resp.data, dict) and "token" in resp.data:
            self.set_token(resp.data["token"])
        return resp
