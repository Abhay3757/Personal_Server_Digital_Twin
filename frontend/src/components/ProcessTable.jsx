/**
 * ProcessTable — Live list of top processes sorted by CPU usage.
 */
export default function ProcessTable({ processes }) {
  if (!processes?.length) return null;

  const sorted = [...processes].sort((a, b) => b.cpu_percent - a.cpu_percent);

  return (
    <div className="card fade-in">
      <div className="section-header">
        <span className="section-title">📋 Top Processes</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by CPU</span>
      </div>

      {/* Header */}
      <div className="proc-row" style={{ borderBottom: '1px solid var(--border)', marginBottom: '0.25rem', paddingBottom: '0.5rem' }}>
        <span className="proc-name" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Process</span>
        <span className="proc-cpu" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CPU</span>
        <span className="proc-mem" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>RAM</span>
      </div>

      {sorted.slice(0, 8).map((p) => (
        <div key={`${p.pid}-${p.name}`} className="proc-row">
          <span className="proc-name">{p.name}</span>
          <span className="proc-cpu">{p.cpu_percent.toFixed(1)}%</span>
          <span className="proc-mem">{p.memory_mb.toFixed(0)} MB</span>
        </div>
      ))}
    </div>
  );
}
