/**
 * useTelemetry — Custom hook
 * Connects to the backend SSE stream and exposes live telemetry state.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { endpoints } from '../config';

const MAX_HISTORY = 40; // points kept for chart rendering

export function useTelemetry() {
  const [data, setData]           = useState(null);
  const [history, setHistory]     = useState({ cpu: [], mem: [], time: [] });
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode]   = useState(false);
  const esRef = useRef(null);

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(endpoints.stream);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setData(msg);
        setDemoMode(msg.demo ?? false);
        setHistory((prev) => {
          const cpu  = [...prev.cpu,  msg.cpu].slice(-MAX_HISTORY);
          const mem  = [...prev.mem,  msg.memory].slice(-MAX_HISTORY);
          const time = [...prev.time, new Date(msg.timestamp).toLocaleTimeString()].slice(-MAX_HISTORY);
          return { cpu, mem, time };
        });
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Retry after 3 seconds
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);

  return { data, history, connected, demoMode };
}
