/**
 * ProcessSection — Per-app prediction panel.
 *
 * Strategy:
 *  - Predefined catalog of common apps with realistic usage profiles.
 *  - If the app is actually running (in `liveProcesses`), fetch real data
 *    + run LR prediction on it → show "Live" badge.
 *  - If the app is NOT running, generate synthetic predictions from the
 *    profile using a time-varying model → show "Predicted" badge.
 *    This lets the demo work without any app actually running.
 */
import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../config';

// ─── App Catalog ─────────────────────────────────────────────
// Each entry: { label, key (process name), cpu baseline, mem baseline MB,
//               cpu volatility, mem volatility, category }
const APP_CATALOG = [
  { label: 'Chrome',        key: 'chrome.exe',    cpuBase: 12,  memBase: 380,  cpuVol: 6,  memVol: 40,  category: 'Browser'    },
  { label: 'VS Code',       key: 'vscode.exe',    cpuBase: 5,   memBase: 450,  cpuVol: 3,  memVol: 30,  category: 'Editor'     },
  { label: 'Node.js',       key: 'node.exe',      cpuBase: 8,   memBase: 140,  cpuVol: 5,  memVol: 20,  category: 'Runtime'    },
  { label: 'Python',        key: 'python.exe',    cpuBase: 10,  memBase: 120,  cpuVol: 8,  memVol: 25,  category: 'Runtime'    },
  { label: 'Spotify',       key: 'spotify.exe',   cpuBase: 2,   memBase: 210,  cpuVol: 1,  memVol: 15,  category: 'Media'      },
  { label: 'Discord',       key: 'discord.exe',   cpuBase: 3,   memBase: 290,  cpuVol: 2,  memVol: 20,  category: 'Comms'      },
  { label: 'Postman',       key: 'postman.exe',   cpuBase: 4,   memBase: 320,  cpuVol: 2,  memVol: 25,  category: 'Dev Tools'  },
  { label: 'Figma',         key: 'figma.exe',     cpuBase: 9,   memBase: 500,  cpuVol: 5,  memVol: 50,  category: 'Design'     },
  { label: 'Explorer',      key: 'explorer.exe',  cpuBase: 1,   memBase: 55,   cpuVol: 1,  memVol: 8,   category: 'System'     },
  { label: 'System',        key: 'system',        cpuBase: 3,   memBase: 30,   cpuVol: 2,  memVol: 5,   category: 'System'     },
];

// ─── Synthetic Prediction Engine ─────────────────────────────
// Simulates a realistic time-series for an app using a profile.
// Returns { cpuNow, memNow, cpuPred, memPred, cpuHistory, memHistory }
function syntheticPrediction(profile, t) {
  const noise = (vol) => (Math.random() - 0.5) * 2 * vol;
  const trend = (base, vol, offset) =>
    Math.max(0, base + Math.sin(t * 0.12 + offset) * vol * 0.5 + noise(vol * 0.3));

  const N = 20;
  const cpuHistory = Array.from({ length: N }, (_, i) =>
    Math.max(0, profile.cpuBase + Math.sin((t - N + i) * 0.12) * profile.cpuVol * 0.5 + noise(profile.cpuVol * 0.25))
  );
  const memHistory = Array.from({ length: N }, (_, i) =>
    Math.max(0, profile.memBase + Math.sin((t - N + i) * 0.06) * profile.memVol * 0.4 + noise(profile.memVol * 0.2))
  );

  // OLS linear regression on the synthetic history
  const linReg = (vals) => {
    const n = vals.length;
    const mx = (n - 1) / 2;
    const my = vals.reduce((s, v) => s + v, 0) / n;
    const num = vals.reduce((s, v, i) => s + (i - mx) * (v - my), 0);
    const den = vals.reduce((s, _, i) => s + (i - mx) ** 2, 0);
    const slope = den === 0 ? 0 : num / den;
    return Math.max(0, my + slope * (n - mx));
  };

  return {
    cpuNow:    parseFloat(trend(profile.cpuBase, profile.cpuVol, 0).toFixed(2)),
    memNow:    parseFloat(trend(profile.memBase, profile.memVol, 1).toFixed(2)),
    cpuPred:   parseFloat(linReg(cpuHistory).toFixed(2)),
    memPred:   parseFloat(linReg(memHistory).toFixed(2)),
    cpuHistory,
    memHistory,
    samples:   N,
  };
}

// ─── Mini progress bar ───────────────────────────────────────
function MiniBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginTop: '0.4rem' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ─── Source Badge ────────────────────────────────────────────
function SourceBadge({ live }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem',
      fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
      fontFamily: 'JetBrains Mono, monospace',
      background: live ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)',
      color: live ? 'var(--state-low)' : 'var(--accent-purple)',
      border: `1px solid ${live ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.3)'}`,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {live ? 'Live' : 'Synthetic ML'}
    </span>
  );
}

// ─── Metric Block ────────────────────────────────────────────
function MetricBlock({ label, value, unit, pred, predUnit, color, max }) {
  const delta = pred != null ? pred - value : null;
  const deltaStr = delta != null
    ? (delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))
    : null;
  const arrowColor = delta == null ? 'var(--text-muted)'
    : delta > 2 ? 'var(--state-high)'
    : delta < -2 ? 'var(--state-low)'
    : 'var(--state-moderate)';

  return (
    <div style={{ padding: '1.1rem', background: `rgba(${color === 'blue' ? '59,130,246' : '139,92,246'},0.06)`, borderRadius: '12px', border: `1px solid rgba(${color === 'blue' ? '59,130,246' : '139,92,246'},0.2)` }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: color === 'blue' ? 'var(--accent-blue)' : 'var(--accent-purple)', lineHeight: 1 }}>
        {value != null ? `${value}` : '—'}
        <span style={{ fontSize: '0.9rem', fontWeight: 400, marginLeft: '3px', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
      <MiniBar value={value ?? 0} max={max} color={color === 'blue' ? 'var(--accent-blue)' : 'var(--accent-purple)'} />

      {pred != null && (
        <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next-step prediction</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-yellow)', fontFamily: 'JetBrains Mono, monospace' }}>
            {pred}{predUnit}
            {deltaStr && (
              <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: arrowColor }}>
                ({deltaStr})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function ProcessSection({ liveProcesses }) {
  const catalog       = APP_CATALOG;
  const [selected, setSelected] = useState(catalog[0].key);
  const [liveData, setLiveData] = useState(null);
  const [tick, setTick]         = useState(0);
  const timerRef                = useRef(null);

  // Advance synthetic tick every 1.5s
  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(timerRef.current);
  }, []);

  // If process IS live, fetch real data
  const isLive = liveProcesses?.includes(selected);

  useEffect(() => {
    if (!isLive) { setLiveData(null); return; }
    let cancelled = false;

    const fetchProc = async () => {
      try {
        const res = await fetch(endpoints.process(selected));
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (!cancelled) setLiveData(d);
      } catch {
        if (!cancelled) setLiveData(null);
      }
    };

    fetchProc();
    const t = setInterval(fetchProc, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [selected, isLive]);

  const profile = catalog.find((a) => a.key === selected) ?? catalog[0];
  const synth   = syntheticPrediction(profile, tick);

  const cpuNow  = isLive ? liveData?.cpu_current  : synth.cpuNow;
  const memNow  = isLive ? liveData?.mem_current  : synth.memNow;
  const cpuPred = isLive ? liveData?.cpu_prediction?.primary : synth.cpuPred;
  const memPred = isLive ? liveData?.mem_prediction?.primary : synth.memPred;
  const samples = isLive ? (liveData?.cpu_history?.length ?? 0) : synth.samples;

  return (
    <div className="card fade-in">
      {/* Header */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="section-title">⚙ App Performance Prediction</span>
          <SourceBadge live={isLive} />
        </div>

        <select
          id="app-select"
          className="select"
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setLiveData(null); }}
        >
          {catalog.map((app) => {
            const running = liveProcesses?.includes(app.key);
            return (
              <option key={app.key} value={app.key}>
                {app.label} ({app.category}){running ? ' ●' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Info strip */}
      <div style={{
        marginBottom: '1rem', padding: '0.5rem 0.75rem',
        background: isLive ? 'rgba(16,185,129,0.05)' : 'rgba(139,92,246,0.05)',
        borderRadius: '8px',
        border: `1px solid ${isLive ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)'}`,
        fontSize: '0.78rem', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
      }}>
        <span>
          {isLive
            ? `Real psutil data for ${selected} · OLS linear regression over ${samples} samples`
            : `${profile.label} is not running · Synthetic ML prediction from usage profile · OLS over ${samples} synthetic samples`}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
          {samples} samples · LR + MA
        </span>
      </div>

      {/* Metric blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <MetricBlock
          label="CPU Usage"
          value={cpuNow != null ? parseFloat(cpuNow.toFixed(1)) : null}
          unit="%"
          pred={cpuPred != null ? parseFloat(cpuPred.toFixed(1)) : null}
          predUnit="%"
          color="blue"
          max={100}
        />
        <MetricBlock
          label="Memory Usage"
          value={memNow != null ? parseFloat(memNow.toFixed(1)) : null}
          unit=" MB"
          pred={memPred != null ? parseFloat(memPred.toFixed(1)) : null}
          predUnit=" MB"
          color="purple"
          max={isLive ? 2000 : profile.memBase * 2.5}
        />

        {/* Profile info */}
        <div style={{ padding: '1.1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            App Profile
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            {profile.label}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            Category: <span style={{ color: 'var(--text-secondary)' }}>{profile.category}</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            CPU baseline: <span style={{ color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono, monospace' }}>{profile.cpuBase}%</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            RAM baseline: <span style={{ color: 'var(--accent-purple)', fontFamily: 'JetBrains Mono, monospace' }}>{profile.memBase} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
