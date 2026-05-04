/**
 * App.jsx — Root application component.
 * Always uses real system telemetry via the psutil agent.
 */
import { useState, useEffect } from 'react';
import './index.css';

import { useTelemetry }    from './hooks/useTelemetry';
import { endpoints }       from './config';

import Navbar              from './components/Navbar';
import MetricCard          from './components/MetricCard';
import TelemetryChart      from './components/TelemetryChart';
import SystemStateCard     from './components/SystemStateCard';
import PredictionPanel     from './components/PredictionPanel';
import ProcessTable        from './components/ProcessTable';
import ProcessSection      from './components/ProcessSection';

export default function App() {
  const { data, history, connected } = useTelemetry();
  const [liveProcesses, setLiveProcesses] = useState([]);

  // Fetch tracked process names (actually running on the system)
  useEffect(() => {
    const fetchProcs = async () => {
      try {
        const res = await fetch(endpoints.processes);
        const d   = await res.json();
        setLiveProcesses(d.processes ?? []);
      } catch {}
    };
    fetchProcs();
    const timer = setInterval(fetchProcs, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Navbar connected={connected} />

      <main style={{ padding: '1.5rem 2rem', maxWidth: '1600px', margin: '0 auto' }}>

        {/* ── Waiting for data ── */}
        {!data && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', gap: '1.5rem',
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)',
              animation: 'spin 1s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Waiting for telemetry data...
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', maxWidth: '380px' }}>
              Start the agent in another terminal:&nbsp;
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                python agent/agent.py
              </code>
            </p>
          </div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Row 1: Metric Cards ── */}
            <div className="dashboard-grid">
              <MetricCard
                title="CPU Usage"
                icon="🖥"
                value={data.cpu}
                subtitle="Real-time"
              />
              <MetricCard
                title="Memory Usage"
                icon="🧠"
                value={data.memory}
                subtitle={`Disk: ${data.disk?.toFixed(1)}%`}
              />
              <MetricCard
                title="Disk Usage"
                icon="💾"
                value={data.disk}
                subtitle="Root partition"
              />
              <SystemStateCard
                state={data.state}
                cpuPred={data.cpu_prediction}
                memPred={data.mem_prediction}
                cpu={data.cpu}
                memory={data.memory}
              />
            </div>

            {/* ── Row 2: Chart (full width) ── */}
            <TelemetryChart
              history={history}
              cpuPred={data.cpu_prediction}
              memPred={data.mem_prediction}
            />

            {/* ── Row 3: Predictions + Process Table ── */}
            <div className="dashboard-grid">
              <PredictionPanel
                label="CPU"
                color="var(--accent-blue)"
                current={data.cpu}
                prediction={data.cpu_prediction}
              />
              <PredictionPanel
                label="RAM"
                color="var(--accent-purple)"
                current={data.memory}
                prediction={data.mem_prediction}
              />
              <ProcessTable processes={data.processes} />
            </div>

            {/* ── Row 4: Per-App Prediction (synthetic ML when app not running) ── */}
            <ProcessSection liveProcesses={liveProcesses} />

            {/* ── Footer ── */}
            <footer style={{
              textAlign: 'center', padding: '1rem 0',
              color: 'var(--text-muted)', fontSize: '0.78rem',
              borderTop: '1px solid var(--border)',
            }}>
              Digital Twin &middot; Real System Telemetry &middot;
              Last update: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}
            </footer>
          </div>
        )}
      </main>
    </>
  );
}
