from __future__ import annotations

import time
from typing import Any, TypeVar

T = TypeVar("T")


class SimpleMemoryCache:
    """Thread-safe, lightweight in-memory cache with TTL."""

    def __init__(self, default_ttl_seconds: int = 300) -> None:
        self._cache: dict[str, tuple[Any, float]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        val, expiry = self._cache[key]
        if time.time() > expiry:
            del self._cache[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)

    def clear(self) -> None:
        self._cache.clear()


# Global in-memory cache instance for clinic branding, settings, and public routes
clinic_cache = SimpleMemoryCache(default_ttl_seconds=300)
