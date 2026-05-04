"""
Digital Twin Backend — FastAPI
Receives telemetry, maintains rolling windows, runs predictions,
and serves the frontend via REST + SSE.
"""

from __future__ import annotations

import asyncio
import json
import math
from collections import deque
from datetime import datetime
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ─── App & Config ──────────────────────────────────────────────────────────────
app = FastAPI(title="Digital Twin Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

WINDOW_SIZE = 20  # rolling window length

# ─── Data Stores ──────────────────────────────────────────────────────────────
cpu_window: deque[float] = deque(maxlen=WINDOW_SIZE)
mem_window: deque[float] = deque(maxlen=WINDOW_SIZE)
disk_window: deque[float] = deque(maxlen=WINDOW_SIZE)
time_window: deque[str]   = deque(maxlen=WINDOW_SIZE)
process_store: dict[str, deque] = {}  # per-process rolling windows

latest_payload: dict[str, Any] = {}
sse_clients: list[asyncio.Queue] = []


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class ProcessInfo(BaseModel):
    name: str
    pid: int
    cpu_percent: float
    memory_mb: float


class TelemetryPayload(BaseModel):
    timestamp: str
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    processes: list[ProcessInfo]
    demo: bool = False
    scenario: Optional[str] = None


# ─── Prediction Engine ────────────────────────────────────────────────────────
def linear_regression_predict(values: list[float]) -> Optional[float]:
    """
    Fit a simple OLS line y = a*t + b over the window,
    then predict the next step value.
    Returns None if insufficient data.
    """
    n = len(values)
    if n < 3:
        return None

    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n

    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    den = sum((x - mean_x) ** 2 for x in xs)

    if den == 0:
        return round(mean_y, 2)

    slope = num / den
    intercept = mean_y - slope * mean_x

    next_x = n  # one step ahead
    prediction = slope * next_x + intercept
    return round(max(0.0, min(100.0, prediction)), 2)


def moving_average(values: list[float], window: int = 5) -> Optional[float]:
    """Simple moving average of the last `window` points."""
    if not values:
        return None
    tail = values[-window:]
    return round(sum(tail) / len(tail), 2)


def predict(values: list[float]) -> dict:
    """Return both prediction methods; primary = linear regression."""
    lst = list(values)
    lr  = linear_regression_predict(lst)
    ma  = moving_average(lst)
    return {
        "linear_regression": lr,
        "moving_average":    ma,
        "primary":           lr if lr is not None else ma,
    }


# ─── System State Classifier ──────────────────────────────────────────────────
def classify_state(cpu: float, mem: float) -> dict:
    score = cpu * 0.6 + mem * 0.4
    if score < 30:
        return {"label": "Low",      "color": "green",  "score": round(score, 1)}
    elif score < 60:
        return {"label": "Moderate", "color": "yellow", "score": round(score, 1)}
    else:
        return {"label": "High",     "color": "red",    "score": round(score, 1)}


# ─── SSE Broadcaster ──────────────────────────────────────────────────────────
async def broadcast(data: dict):
    dead = []
    for q in sse_clients:
        try:
            await q.put(data)
        except Exception:
            dead.append(q)
    for q in dead:
        sse_clients.remove(q)


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.post("/telemetry")
async def receive_telemetry(payload: TelemetryPayload):
    """Ingest telemetry from the agent."""
    cpu_window.append(payload.cpu_percent)
    mem_window.append(payload.memory_percent)
    disk_window.append(payload.disk_percent)
    time_window.append(payload.timestamp)

    # Per-process tracking
    for proc in payload.processes:
        key = proc.name.lower()
        if key not in process_store:
            process_store[key] = {
                "cpu": deque(maxlen=WINDOW_SIZE),
                "mem": deque(maxlen=WINDOW_SIZE),
            }
        process_store[key]["cpu"].append(proc.cpu_percent)
        process_store[key]["mem"].append(proc.memory_mb)

    # Build full state snapshot
    cpu_pred = predict(cpu_window)
    mem_pred = predict(mem_window)
    state    = classify_state(payload.cpu_percent, payload.memory_percent)

    snapshot = {
        "timestamp":       payload.timestamp,
        "cpu":             payload.cpu_percent,
        "memory":          payload.memory_percent,
        "disk":            payload.disk_percent,
        "cpu_history":     list(cpu_window),
        "mem_history":     list(mem_window),
        "time_history":    list(time_window),
        "cpu_prediction":  cpu_pred,
        "mem_prediction":  mem_pred,
        "state":           state,
        "processes":       [p.dict() for p in payload.processes],
        "demo":            payload.demo,
        "scenario":        payload.scenario,
    }

    latest_payload.clear()
    latest_payload.update(snapshot)

    # Push to all SSE listeners
    await broadcast(snapshot)

    return {"status": "ok"}


@app.get("/state")
def get_state():
    """Return the latest digital twin state snapshot."""
    return latest_payload or {"message": "No data yet"}


@app.get("/history")
def get_history():
    """Return the rolling windows for CPU and memory."""
    return {
        "cpu":  list(cpu_window),
        "mem":  list(mem_window),
        "disk": list(disk_window),
        "time": list(time_window),
    }


@app.get("/processes")
def get_processes():
    """Return list of tracked process names."""
    return {"processes": sorted(process_store.keys())}


@app.get("/process/{name}")
def get_process(name: str):
    """Return rolling window + prediction for a named process."""
    key = name.lower()
    if key not in process_store:
        return {"error": f"Process '{name}' not found"}

    cpu_vals = list(process_store[key]["cpu"])
    mem_vals = list(process_store[key]["mem"])

    return {
        "name":           key,
        "cpu_history":    cpu_vals,
        "mem_history":    mem_vals,
        "cpu_current":    cpu_vals[-1] if cpu_vals else None,
        "mem_current":    mem_vals[-1] if mem_vals else None,
        "cpu_prediction": predict(cpu_vals),
        "mem_prediction": predict(mem_vals),
    }


@app.post("/simulate-load")
async def simulate_load():
    """
    Inject a synthetic heavy-load spike into the rolling windows
    (useful for demo mode UI button).
    """
    import random
    for _ in range(5):
        cpu_window.append(round(random.uniform(80, 95), 2))
        mem_window.append(round(random.uniform(75, 90), 2))

    snapshot = dict(latest_payload)
    snapshot["cpu"] = list(cpu_window)[-1]
    snapshot["memory"] = list(mem_window)[-1]
    snapshot["state"] = classify_state(snapshot["cpu"], snapshot["memory"])
    snapshot["cpu_prediction"] = predict(cpu_window)
    snapshot["mem_prediction"] = predict(mem_window)
    latest_payload.update(snapshot)
    await broadcast(snapshot)
    return {"status": "spike injected"}


@app.get("/stream")
async def stream(request: Request):
    """Server-Sent Events endpoint for real-time push to frontend."""
    queue: asyncio.Queue = asyncio.Queue()
    sse_clients.append(queue)

    async def event_generator():
        try:
            # Send current state immediately on connect
            if latest_payload:
                yield f"data: {json.dumps(latest_payload)}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"  # keep-alive
        finally:
            if queue in sse_clients:
                sse_clients.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
def health():
    return {"status": "ok", "clients": len(sse_clients)}
