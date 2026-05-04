/**
 * ProcessSection — Per-app process tracking with dropdown selector.
 * Fetches per-process telemetry and predictions on demand.
 */
import { useState, useEffect } from 'react';
import { endpoints } from '../config';

function MiniBar({ value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
    </div>
  );
}

export default function ProcessSection({ processes }) {
  const [selected, setSelected]   = useState('');
  const [procData, setProcData]   = useState(null);
  const [loading, setLoading]     = useState(false);

  // Auto-select first process
  useEffect(() => {
    if (processes?.length && !selected) {
      setSelected(processes[0]);
    }
  }, [processes]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const fetchProc = async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoints.process(selected));
        if (!res.ok) throw new Error('not found');
        const d = await res.json();
        if (!cancelled) setProcData(d);
      } catch {
        if (!cancelled) setProcData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProc();
    const timer = setInterval(fetchProc, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [selected]);

  const cpu     = procData?.cpu_current;
  const mem     = procData?.mem_current;
  const cpuPred = procData?.cpu_prediction?.primary;
  const memPred = procData?.mem_prediction?.primary;

  return (
    <div className="card fade-in" style={{ gridColumn: 'span 2' }}>
      <div className="section-header">
        <span className="section-title">⚙ Per-Process Analysis</span>

        <select
          id="process-select"
          className="select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {(processes || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {loading && !procData && (
        <div className="shimmer" style={{ height: '80px', borderRadius: '8px' }} />
      )}

      {procData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* CPU block */}
          <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CPU Usage
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-blue)', lineHeight: 1 }}>
              {cpu != null ? `${cpu.toFixed(1)}%` : '—'}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MiniBar value={cpu ?? 0} color="var(--accent-blue)" />
            </div>
            {cpuPred != null && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-yellow)' }}>
                Predicted: {cpuPred}%
              </div>
            )}
          </div>

          {/* Memory block */}
          <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.06)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Memory Usage
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)', lineHeight: 1 }}>
              {mem != null ? `${mem.toFixed(1)} MB` : '—'}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MiniBar value={mem ?? 0} max={2000} color="var(--accent-purple)" />
            </div>
            {memPred != null && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--accent-yellow)' }}>
                Predicted: {memPred.toFixed(1)} MB
              </div>
            )}
          </div>

          {/* History sparkline info */}
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Data Window
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {procData.cpu_history?.length ?? 0}
              <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>samples</span>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              LR + MA predictions active
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              PID: {procData.name}
            </div>
          </div>
        </div>
      )}

      {!loading && !procData && selected && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data for "{selected}" yet.</p>
      )}
    </div>
  );
}
