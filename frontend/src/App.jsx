/**
 * App.jsx — Root application component.
 * Wires together the telemetry hook and all dashboard panels.
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
  const { data, history, connected, demoMode } = useTelemetry();
  const [processes, setProcesses] = useState([]);

  // Fetch tracked process names from backend
  useEffect(() => {
    const fetchProcs = async () => {
      try {
        const res = await fetch(endpoints.processes);
        const d   = await res.json();
        setProcesses(d.processes ?? []);
      } catch {}
    };
    fetchProcs();
    const timer = setInterval(fetchProcs, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateLoad = async () => {
    try {
      await fetch(endpoints.simulateLoad, { method: 'POST' });
    } catch (e) {
      console.error('Simulate load failed:', e);
    }
  };

  return (
    <>
      <Navbar
        connected={connected}
        demoMode={demoMode}
        scenario={data?.scenario}
        onSimulateLoad={handleSimulateLoad}
      />

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
              Waiting for telemetry data…
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', maxWidth: '360px' }}>
              Start the agent:&nbsp;
              <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono' }}>
                python agent/agent.py --demo
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
                subtitle={demoMode ? `Scenario: ${data.scenario}` : 'Real-time'}
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

            {/* ── Row 4: Per-Process Section ── */}
            <ProcessSection processes={processes} />

            {/* ── Footer ── */}
            <footer style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border)' }}>
              Digital Twin Dashboard · {demoMode ? '🔵 Demo Mode' : '🟢 Real Telemetry'} ·
              Last update: {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}
            </footer>
          </div>
        )}
      </main>
    </>
  );
}
