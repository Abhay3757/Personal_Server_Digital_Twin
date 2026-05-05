# Team 5
- Abhay Singh (RA2311027010082)
- Govind H Warrier (RA2311027010083)
- Ritwik Kumar (RA2311027010089)


# Digital Twin — PC Telemetry Dashboard

**Web-Based Digital Twin for Telemetry-Driven Performance Modeling of Personal Computers**

Real-time system monitoring with predictive analytics. Supports both real telemetry (psutil) and a demo mode with synthetic, scenario-driven data.

---

## Project Structure

```
Personal_Server_Digital_Twin/
├── agent/
│   ├── agent.py          # Telemetry collector (real + demo mode)
│   └── requirements.txt
├── backend/
│   ├── main.py           # FastAPI backend (digital twin + predictions + SSE)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── config.js
        ├── index.css
        ├── hooks/
        │   └── useTelemetry.js   # SSE hook
        └── components/
            ├── Navbar.jsx
            ├── MetricCard.jsx
            ├── TelemetryChart.jsx
            ├── SystemStateCard.jsx
            ├── PredictionPanel.jsx
            ├── ProcessTable.jsx
            └── ProcessSection.jsx
```

---

## Quick Start (3 terminals)

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Agent (Demo Mode)
```bash
# Demo mode (synthetic data — recommended for demo/presentation)
python agent/agent.py --demo

# Real mode (actual system telemetry)
python agent/agent.py
```

### Terminal 3 — Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Architecture

```
agent.py  --[POST /telemetry]--> main.py (FastAPI)
                                     |
                              Rolling Window (20 pts)
                              Linear Regression + Moving Avg
                              State Classifier (Low/Moderate/High)
                                     |
                         [GET /stream SSE] --> React Frontend
                         [GET /state]
                         [GET /process/:name]
                         [POST /simulate-load]
```

---

## API Reference

| Method | Endpoint             | Description                          |
|--------|----------------------|--------------------------------------|
| POST   | `/telemetry`         | Ingest telemetry from agent          |
| GET    | `/state`             | Latest digital twin snapshot         |
| GET    | `/history`           | Rolling window data                  |
| GET    | `/processes`         | List tracked process names           |
| GET    | `/process/{name}`    | Per-process data + predictions       |
| POST   | `/simulate-load`     | Inject heavy load spike              |
| GET    | `/stream`            | SSE stream (real-time push)          |
| GET    | `/health`            | Health check                         |

### Example `/state` Response
```json
{
  "timestamp": "2026-05-04T19:06:58.990713",
  "cpu": 94.26,
  "memory": 80.6,
  "disk": 40.13,
  "cpu_prediction": {
    "linear_regression": 93.56,
    "moving_average": 88.53,
    "primary": 93.56
  },
  "mem_prediction": {
    "linear_regression": 82.29,
    "moving_average": 79.01,
    "primary": 82.29
  },
  "state": { "label": "High", "color": "red", "score": 88.8 },
  "processes": [...],
  "demo": true,
  "scenario": "heavy"
}
```

---

## Features

### Demo Mode
- Automated scenario cycling: **Idle → Moderate → Heavy**
- Sinusoidal trends + Gaussian noise for realism
- Configurable scenario duration (20–60 sec)
- Same prediction pipeline runs on synthetic data

### Prediction Engine (backend/main.py)
- **Linear Regression (OLS)**: Fits `y = a*t + b` over rolling window, extrapolates one step ahead
- **Moving Average**: 5-point trailing mean
- Primary forecast = Linear Regression (falls back to MA if window < 3)

### System State Model
- Composite score = `CPU × 0.6 + RAM × 0.4`
- **Low** (score < 30): Green
- **Moderate** (30–60): Yellow
- **High** (> 60): Red

### Per-Process Tracking
- Agent sends top-10 processes by CPU per tick
- Backend maintains per-process rolling windows
- Frontend dropdown lets you inspect any tracked process

---

## Frontend Dashboard

| Panel | Description |
|-------|-------------|
| Metric Cards | CPU %, RAM %, Disk % with animated progress bars |
| Real-Time Chart | Area chart (CPU + RAM) with prediction reference lines |
| System State | Color-coded badge + composite score |
| CPU Prediction | Linear regression vs moving average comparison |
| RAM Prediction | Linear regression vs moving average comparison |
| Process Table | Top processes ranked by CPU |
| Per-Process Section | Dropdown → current + predicted CPU/RAM for selected process |

---

## Constraints Met
- ✅ No deep learning (pure OLS + MA)
- ✅ No external datasets
- ✅ Lightweight (psutil + FastAPI + Recharts)
- ✅ Demo mode for stable presentation
- ✅ Real-time (≤1.5 sec update interval)
- ✅ Modular: agent / backend / frontend separation
