/**
 * Navbar — Top navigation with live connection status and controls.
 */
import { endpoints } from '../config';

const CPU_ICON = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="9" y="9" width="6" height="6"/>
    <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>
  </svg>
);

export default function Navbar({ connected, demoMode, scenario, onSimulateLoad, onToggleDemo }) {
  const statusLabel = connected ? 'Live' : 'Reconnecting...';
  const statusClass = connected ? 'connected' : 'waiting';

  const handleSimulate = async () => {
    try {
      await fetch(endpoints.simulateLoad, { method: 'POST' });
    } catch (e) {
      console.error('Simulate failed:', e);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-icon">
          <CPU_ICON />
        </div>
        <span>Digital Twin</span>
        {demoMode && scenario && (
          <span className="scenario-tag">{scenario} mode</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Demo Toggle */}
        <label className="toggle-wrapper" htmlFor="demo-toggle" title="Demo Mode">
          <div className={`toggle-track ${demoMode ? 'on' : ''}`} onClick={onToggleDemo} id="demo-toggle">
            <div className="toggle-thumb" />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
            Demo Mode
          </span>
        </label>

        {/* Simulate Load */}
        <button className="btn btn-danger" onClick={onSimulateLoad || handleSimulate} id="simulate-load-btn">
          ⚡ Simulate Heavy Load
        </button>

        {/* Connection Status */}
        <div className="conn-status">
          <div className={`conn-dot ${statusClass}`} />
          <span style={{ color: connected ? 'var(--state-low)' : 'var(--state-moderate)' }}>
            {statusLabel}
          </span>
        </div>
      </div>
    </nav>
  );
}
