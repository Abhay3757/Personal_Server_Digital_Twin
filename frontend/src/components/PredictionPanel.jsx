/**
 * PredictionPanel — Shows prediction details for a metric (CPU or RAM).
 * Displays current value, linear regression, and moving average predictions.
 */

function TrendArrow({ current, predicted }) {
  if (predicted == null) return null;
  const delta = predicted - current;
  if (delta > 2)  return <span style={{ color: 'var(--state-high)' }}>▲ Rising</span>;
  if (delta < -2) return <span style={{ color: 'var(--state-low)' }}>▼ Dropping</span>;
  return <span style={{ color: 'var(--state-moderate)' }}>→ Stable</span>;
}

export default function PredictionPanel({ label, color, current, prediction }) {
  const lr  = prediction?.linear_regression;
  const ma  = prediction?.moving_average;
  const pri = prediction?.primary;

  return (
    <div className="card fade-in">
      <div className="section-header">
        <span className="section-title" style={{ color }}>
          🔮 {label} Prediction
        </span>
        <TrendArrow current={current} predicted={pri} />
      </div>

      <div className="pred-row">
        <span className="pred-label">Current</span>
        <span className="pred-value" style={{ color }}>
          {current != null ? `${current.toFixed(1)}%` : '—'}
        </span>
      </div>

      <div className="pred-row" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
        <span className="pred-label">Linear Regression</span>
        <span className="pred-value" style={{ color: 'var(--accent-yellow)' }}>
          {lr != null ? `${lr}%` : '—'}
        </span>
      </div>

      <div className="pred-row">
        <span className="pred-label">Moving Average</span>
        <span className="pred-value" style={{ color: 'var(--text-secondary)' }}>
          {ma != null ? `${ma}%` : '—'}
        </span>
      </div>

      <div style={{
        marginTop: '0.75rem',
        padding: '0.6rem 0.75rem',
        background: 'rgba(245,158,11,0.06)',
        borderRadius: '8px',
        border: '1px solid rgba(245,158,11,0.2)',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
      }}>
        Primary forecast uses OLS linear regression over {20} samples.
        Moving average is a 5-point trailing window.
      </div>
    </div>
  );
}
