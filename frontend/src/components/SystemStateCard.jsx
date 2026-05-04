/**
 * SystemStateCard — Shows the digital twin system state (Low/Moderate/High)
 * with a color-coded badge, score, and prediction delta.
 */

export default function SystemStateCard({ state, cpuPred, memPred, cpu, memory }) {
  const label = state?.label ?? '—';
  const color = state?.color ?? 'yellow';
  const score = state?.score ?? 0;

  const cpuNext  = cpuPred?.primary;
  const memNext  = memPred?.primary;
  const cpuDelta = cpuNext != null ? (cpuNext - (cpu ?? 0)).toFixed(1) : null;
  const memDelta = memNext != null ? (memNext - (memory ?? 0)).toFixed(1) : null;

  const arrow = (delta) => {
    if (delta == null) return '—';
    const n = parseFloat(delta);
    if (n > 1)  return `▲ +${delta}%`;
    if (n < -1) return `▼ ${delta}%`;
    return `→ ${delta}%`;
  };

  const arrowColor = (delta) => {
    if (delta == null) return 'var(--text-muted)';
    const n = parseFloat(delta);
    if (n > 3)  return 'var(--state-high)';
    if (n < -3) return 'var(--state-low)';
    return 'var(--state-moderate)';
  };

  return (
    <div className="card fade-in">
      <div className="section-header">
        <span className="section-title">🖥 System State</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Digital Twin Model</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className={`state-badge ${color}`}>
          <div className="state-dot" />
          {label}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Composite score: <strong style={{ color: 'var(--text-primary)' }}>{score}</strong>
        </span>
      </div>

      {/* Score bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{
            width: `${score}%`,
            background: color === 'green'
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : color === 'yellow'
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #ef4444, #f87171)',
          }}
        />
      </div>

      {/* Prediction summary */}
      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="pred-row">
          <span className="pred-label">CPU → next step</span>
          <span className="pred-value" style={{ color: arrowColor(cpuDelta) }}>
            {cpuNext != null ? `${cpuNext}%` : '—'}
            {cpuDelta && (
              <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: arrowColor(cpuDelta) }}>
                ({arrow(cpuDelta)})
              </span>
            )}
          </span>
        </div>
        <div className="pred-row">
          <span className="pred-label">RAM → next step</span>
          <span className="pred-value" style={{ color: arrowColor(memDelta) }}>
            {memNext != null ? `${memNext}%` : '—'}
            {memDelta && (
              <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: arrowColor(memDelta) }}>
                ({arrow(memDelta)})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
