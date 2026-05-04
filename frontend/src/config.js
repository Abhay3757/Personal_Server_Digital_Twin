// Central API + SSE configuration
export const API_BASE = 'http://localhost:8000';

export const endpoints = {
  telemetry:    `${API_BASE}/telemetry`,
  state:        `${API_BASE}/state`,
  history:      `${API_BASE}/history`,
  processes:    `${API_BASE}/processes`,
  process:      (name) => `${API_BASE}/process/${name}`,
  simulateLoad: `${API_BASE}/simulate-load`,
  stream:       `${API_BASE}/stream`,
  health:       `${API_BASE}/health`,
};
