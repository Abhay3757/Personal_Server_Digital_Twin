/**
 * TelemetryChart — Recharts line chart for CPU and Memory history.
 * Shows actual + predicted next-step values as reference lines.
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13,21,38,0.95)',
      border: '1px solid rgba(99,179,237,0.2)',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      fontSize: '0.8rem',
      backdropFilter: 'blur(10px)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, marginBottom: '0.2rem' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%</strong>
        </p>
      ))}
    </div>
  );
};

export default function TelemetryChart({ history, cpuPred, memPred }) {
  const chartData = history.time.map((t, i) => ({
    time: t,
    cpu:  history.cpu[i]  ?? 0,
    mem:  history.mem[i]  ?? 0,
  }));

  const cpuNext = cpuPred?.primary;
  const memNext = memPred?.primary;

  return (
    <div className="card fade-in" style={{ gridColumn: 'span 2' }}>
      <div className="section-header">
        <span className="section-title">📈 Real-Time Telemetry</span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
          {cpuNext != null && (
            <span style={{ color: 'var(--pred-color)' }}>
              CPU Prediction → {cpuNext}%
            </span>
          )}
          {memNext != null && (
            <span style={{ color: 'var(--accent-purple)' }}>
              RAM Prediction → {memNext}%
            </span>
          )}
        </div>
      </div>

      <div className="chart-container" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              interval="preserveStartEnd"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '1rem', fontSize: '0.8rem' }}
              formatter={(value) => (
                <span style={{ color: 'var(--text-secondary)' }}>
                  {value === 'cpu' ? 'CPU %' : 'RAM %'}
                </span>
              )}
            />

            <Area
              type="monotone"
              dataKey="cpu"
              name="cpu"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#cpuGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="mem"
              name="mem"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#memGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />

            {/* Prediction reference lines */}
            {cpuNext != null && (
              <ReferenceLine
                y={cpuNext}
                stroke="#f59e0b"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `CPU↗${cpuNext}%`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
              />
            )}
            {memNext != null && (
              <ReferenceLine
                y={memNext}
                stroke="#a78bfa"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{ value: `RAM↗${memNext}%`, fill: '#a78bfa', fontSize: 10, position: 'insideBottomRight' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
