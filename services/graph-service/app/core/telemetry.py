from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from opentelemetry import trace

tracer = trace.get_tracer("cortexos.graph-service")


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


async def telemetry_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started = time.perf_counter()

    with tracer.start_as_current_span(f"{request.method} {request.url.path}") as span:
        span.set_attribute("http.method", request.method)
        span.set_attribute("http.target", request.url.path)
        span.set_attribute("cortex.request_id", request_id)
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        span.set_attribute("http.status_code", response.status_code)
        span.set_attribute("http.duration_ms", round(elapsed_ms, 2))
        response.headers["x-request-id"] = request_id
        response.headers["x-response-time-ms"] = f"{elapsed_ms:.2f}"
        return response
