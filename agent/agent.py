"""
Telemetry Agent for Digital Twin
Collects system metrics and sends to backend every 1-2 seconds.
Supports both real and demo modes.
"""

import time
import math
import random
import argparse
import requests
import psutil
from datetime import datetime

# ─── Configuration ────────────────────────────────────────────────────────────
BACKEND_URL = "http://localhost:8000/telemetry"
INTERVAL = 1.5  # seconds between sends
DEMO_MODE = False  # override via --demo flag

# ─── Demo Mode Telemetry Generator ────────────────────────────────────────────
class DemoGenerator:
    """Generates synthetic but realistic telemetry data with trends and noise."""

    SCENARIOS = ["idle", "moderate", "heavy"]

    def __init__(self):
        self.t = 0
        self.scenario = "idle"
        self.scenario_duration = 0
        self.scenario_time = 0
        self._switch_scenario()

    def _switch_scenario(self):
        self.scenario = random.choice(self.SCENARIOS)
        self.scenario_duration = random.randint(20, 60)  # seconds
        self.scenario_time = 0
        print(f"[DEMO] Switching to scenario: {self.scenario}")

    def _noise(self, scale=1.0):
        return random.gauss(0, scale)

    def _cpu(self):
        base = {"idle": 8, "moderate": 45, "heavy": 82}[self.scenario]
        trend = math.sin(self.t * 0.1) * 5
        return max(0.0, min(100.0, base + trend + self._noise(3)))

    def _memory(self):
        base = {"idle": 35, "moderate": 58, "heavy": 78}[self.scenario]
        trend = math.sin(self.t * 0.05) * 3
        return max(0.0, min(100.0, base + trend + self._noise(2)))

    def _disk(self):
        # Disk is slower to change
        base = {"idle": 2, "moderate": 15, "heavy": 40}[self.scenario]
        return max(0.0, min(100.0, base + self._noise(1)))

    def _processes(self):
        fake_procs = [
            ("chrome.exe",   random.uniform(2, 20), random.uniform(100, 400)),
            ("python.exe",   random.uniform(0, 15), random.uniform(50, 150)),
            ("vscode.exe",   random.uniform(1, 8),  random.uniform(200, 500)),
            ("node.exe",     random.uniform(0, 10), random.uniform(80, 200)),
            ("explorer.exe", random.uniform(0, 2),  random.uniform(30, 80)),
            ("system",       random.uniform(0, 5),  random.uniform(10, 60)),
        ]
        scale = {"idle": 0.2, "moderate": 0.7, "heavy": 1.4}[self.scenario]
        return [
            {
                "name": name,
                "pid": 1000 + i * 100,
                "cpu_percent": round(cpu * scale + self._noise(0.5), 2),
                "memory_mb": round(mem + self._noise(5), 2),
            }
            for i, (name, cpu, mem) in enumerate(fake_procs)
        ]

    def generate(self):
        self.t += INTERVAL
        self.scenario_time += INTERVAL
        if self.scenario_time >= self.scenario_duration:
            self._switch_scenario()

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu_percent": round(self._cpu(), 2),
            "memory_percent": round(self._memory(), 2),
            "disk_percent": round(self._disk(), 2),
            "processes": self._processes(),
            "demo": True,
            "scenario": self.scenario,
        }


# ─── Real Telemetry Collector ─────────────────────────────────────────────────
def collect_real_telemetry():
    """Collect actual system metrics using psutil."""
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    procs = []
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info"]):
        try:
            info = proc.info
            if info["cpu_percent"] is not None:
                procs.append({
                    "name": info["name"],
                    "pid": info["pid"],
                    "cpu_percent": round(info["cpu_percent"], 2),
                    "memory_mb": round(info["memory_info"].rss / 1024 / 1024, 2)
                    if info["memory_info"] else 0,
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort by CPU usage, top 10
    procs.sort(key=lambda x: x["cpu_percent"], reverse=True)
    procs = procs[:10]

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "cpu_percent": round(cpu, 2),
        "memory_percent": round(mem.percent, 2),
        "disk_percent": round(disk.percent, 2),
        "processes": procs,
        "demo": False,
        "scenario": None,
    }


# ─── Main Loop ────────────────────────────────────────────────────────────────
def run(demo=False):
    mode = "DEMO" if demo else "REAL"
    print(f"[Agent] Starting in {mode} mode -> {BACKEND_URL}")
    demo_gen = DemoGenerator() if demo else None

    while True:
        try:
            payload = demo_gen.generate() if demo else collect_real_telemetry()
            resp = requests.post(BACKEND_URL, json=payload, timeout=3)
            status = "OK" if resp.status_code == 200 else f"ERR {resp.status_code}"
            cpu = payload["cpu_percent"]
            mem = payload["memory_percent"]
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {status} CPU={cpu}% MEM={mem}%")
        except requests.exceptions.ConnectionError:
            print("[Agent] Backend not reachable - retrying...")
        except Exception as e:
            print(f"[Agent] Error: {e}")

        time.sleep(INTERVAL)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Digital Twin Telemetry Agent")
    parser.add_argument("--demo", action="store_true", help="Run in demo mode")
    args = parser.parse_args()
    run(demo=args.demo or DEMO_MODE)
