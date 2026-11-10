"""Internal service-to-service authentication for VíaLibre microservices.

Calls between services (auth <-> core <-> match) are authenticated with a
short-lived, request-bound token sent in the ``X-Service-Token`` header. The
token is an HMAC-SHA256 signature (using the JWT secret already configured via
``JWT_SECRET_KEY``) over a canonical payload that binds:

    - the calling service identity (``s``),
    - a unix timestamp (``t``),
    - a random single-use nonce (``n``),
    - the HTTP method (``m``),
    - the exact URL path (``p``).

This provides cryptographic validation, a short temporal window, request
binding and replay protection. No credential is hardcoded: the secret always
comes from settings.

Wire format::

    v1.<base64url(payload_json)>.<hex_hmac_sha256>

Anti-replay state lives at the *verifier* (auth-service) in :class:`NonceStore`.
It is valid while a single verifier process handles the tokens; scaling to
multiple verifier processes/replicas requires a shared store (see the report).
"""

import base64
import hashlib
import hmac
import json
import os
import threading
import time

SERVICE_TOKEN_HEADER = "X-Service-Token"

# Explicit allowlist of legitimate internal callers. A correctly signed token
# whose ``s`` is not in this set is rejected (condition: no arbitrary identity).
ALLOWED_SERVICES = frozenset({"core-service", "match-service"})

# Temporal window: a token is accepted only while
#     now - WINDOW <= ts <= now + SKEW
# i.e. an explicit past-validity window plus a bounded future clock skew.
SERVICE_TOKEN_WINDOW = 60  # seconds of past validity
SERVICE_TOKEN_SKEW = 10    # seconds of allowed future clock skew

_VERSION = "v1"


class ServiceTokenError(Exception):
    """Raised when an internal service token is missing, malformed or invalid."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign(secret_key: str, signing_input: bytes) -> str:
    return hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).hexdigest()


def build_service_token(
    secret_key: str,
    service_name: str,
    method: str,
    path: str,
    *,
    now: float | None = None,
    nonce: str | None = None,
) -> str:
    """Build a request-bound internal service token.

    ``method`` and ``path`` must be the exact HTTP method and URL path the
    caller will use at the destination, so the token is only valid for that
    single request target.
    """
    payload = {
        "m": method,
        "n": nonce or os.urandom(16).hex(),
        "p": path,
        "s": service_name,
        "t": int(now if now is not None else time.time()),
    }
    encoded = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{_VERSION}.{encoded}".encode("ascii")
    return f"{_VERSION}.{encoded}.{_sign(secret_key, signing_input)}"


def service_headers(
    secret_key: str,
    service_name: str,
    method: str,
    path: str,
    *,
    now: float | None = None,
    nonce: str | None = None,
) -> dict[str, str]:
    """Convenience wrapper returning the header dict for an internal call."""
    return {
        SERVICE_TOKEN_HEADER: build_service_token(
            secret_key, service_name, method, path, now=now, nonce=nonce
        )
    }


def verify_service_token(
    token: str | None,
    secret_key: str,
    method: str,
    path: str,
    *,
    store: "NonceStore | None" = None,
    now: float | None = None,
    window: int = SERVICE_TOKEN_WINDOW,
    skew: int = SERVICE_TOKEN_SKEW,
    allowed_services: frozenset[str] = ALLOWED_SERVICES,
) -> str:
    """Verify a request-bound internal service token.

    Fails closed with :class:`ServiceTokenError` on any missing, malformed,
    tampered, expired, replayed or incorrectly bound token. Returns the
    validated service name on success.
    """
    if not token:
        raise ServiceTokenError("missing token")

    parts = token.split(".")
    if len(parts) != 3 or parts[0] != _VERSION:
        raise ServiceTokenError("malformed token")
    _, encoded, signature = parts

    signing_input = f"{_VERSION}.{encoded}".encode("ascii")
    expected = _sign(secret_key, signing_input)
    if not hmac.compare_digest(signature, expected):
        raise ServiceTokenError("invalid signature")

    try:
        payload = json.loads(_b64url_decode(encoded))
    except (ValueError, TypeError):
        raise ServiceTokenError("malformed payload")
    if not isinstance(payload, dict):
        raise ServiceTokenError("malformed payload")

    service = payload.get("s")
    timestamp = payload.get("t")
    nonce = payload.get("n")
    pmethod = payload.get("m")
    ppath = payload.get("p")

    if not isinstance(service, str) or not isinstance(nonce, str):
        raise ServiceTokenError("malformed payload")
    if not isinstance(pmethod, str) or not isinstance(ppath, str):
        raise ServiceTokenError("malformed payload")
    if isinstance(timestamp, bool) or not isinstance(timestamp, int):
        raise ServiceTokenError("malformed payload")

    if service not in allowed_services:
        raise ServiceTokenError("unknown service")

    current = now if now is not None else time.time()
    if not (current - window <= timestamp <= current + skew):
        raise ServiceTokenError("expired token")

    if pmethod != method:
        raise ServiceTokenError("method mismatch")
    if ppath != path:
        raise ServiceTokenError("path mismatch")

    if store is not None:
        # The nonce must be remembered until the latest instant this token's
        # timestamp could still be accepted, i.e. now == ts + window.
        expires_at = timestamp + window
        if not store.check_and_store(f"{service}:{nonce}", expires_at, current):
            raise ServiceTokenError("replayed token")

    return service


class NonceStore:
    """Thread-safe, bounded TTL store of seen nonces.

    ``check_and_store`` performs the check-and-insert atomically under a lock,
    so two concurrent requests carrying the same nonce cannot both be accepted.
    Expired entries are purged on every write and a hard size cap prevents
    unbounded growth.
    """

    def __init__(self, max_size: int = 10000) -> None:
        self._entries: dict[str, float] = {}
        self._lock = threading.Lock()
        self._max_size = max_size

    def check_and_store(self, key: str, expires_at: float, now: float | None = None) -> bool:
        """Return True if ``key`` was unseen (and is now stored); False on replay."""
        current = now if now is not None else time.time()
        with self._lock:
            self._purge_locked(current)
            if key in self._entries:
                return False
            if len(self._entries) >= self._max_size:
                self._evict_locked()
            self._entries[key] = expires_at
            return True

    def purge(self, now: float | None = None) -> None:
        """Drop expired entries (used for maintenance and by tests)."""
        with self._lock:
            self._purge_locked(now if now is not None else time.time())

    def _purge_locked(self, now: float) -> None:
        if not self._entries:
            return
        expired = [key for key, expiry in self._entries.items() if expiry < now]
        for key in expired:
            del self._entries[key]

    def _evict_locked(self) -> None:
        oldest = min(self._entries, key=self._entries.__getitem__)
        del self._entries[oldest]

    def __len__(self) -> int:
        return len(self._entries)

    def __contains__(self, key: str) -> bool:
        return key in self._entries
