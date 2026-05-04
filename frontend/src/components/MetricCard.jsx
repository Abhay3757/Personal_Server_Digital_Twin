/**
 * MetricCard — Displays a single metric (CPU/Memory/Disk)
 * with a progress bar and color-coded fill.
 */

function getColor(value) {
  if (value < 40) return 'var(--accent-green)';
  if (value < 70) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

function getGradient(value) {
  if (value < 40) return 'linear-gradient(90deg, #10b981, #34d399)';
  if (value < 70) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
  return 'linear-gradient(90deg, #ef4444, #f87171)';
}

export default function MetricCard({ title, value, unit = '%', icon, subtitle }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const color = getColor(pct);
  const gradient = getGradient(pct);

  return (
    <div className="card fade-in" style={{ minHeight: '160px' }}>
      <div className="section-header">
        <span className="section-title">
          <span style={{ color }}>{icon}</span>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>
        )}
      </div>

      <div className="metric-value" style={{ color }}>
        {value != null ? pct.toFixed(1) : '—'}<span style={{ fontSize: '1.2rem', fontWeight: 400, marginLeft: '4px', color: 'var(--text-secondary)' }}>{unit}</span>
      </div>

      <div className="progress-track" style={{ marginTop: '1rem' }}>
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: gradient }}
        />
      </div>
    </div>
  );
}
