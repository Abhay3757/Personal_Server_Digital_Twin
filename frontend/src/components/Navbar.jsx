/**
 * Navbar — Top navigation with live connection status.
 * No demo toggle, no simulate button — always real system data.
 */

const CPU_ICON = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6" height="6"/>
    <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
  </svg>
);

export default function Navbar({ connected }) {
  const statusLabel = connected ? 'Live' : 'Reconnecting...';
  const statusClass = connected ? 'connected' : 'waiting';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-icon">
          <CPU_ICON />
        </div>
        <span>Digital Twin</span>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          padding: '0.2rem 0.6rem',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          Real System
        </span>
      </div>

      <div className="conn-status">
        <div className={`conn-dot ${statusClass}`} />
        <span style={{ color: connected ? 'var(--state-low)' : 'var(--state-moderate)' }}>
          {statusLabel}
        </span>
      </div>
    </nav>
  );
}
