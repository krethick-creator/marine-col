// Optional frontend helper. Copy this file into your existing frontend only if needed.
// It does not change your existing dashboard layout.
import { io } from 'socket.io-client';

export const ALERT_API = import.meta.env.VITE_ALERT_API_URL || 'http://localhost:5000';

export async function loadAlerts() {
  const response = await fetch(`${ALERT_API}/api/alerts`);
  if (!response.ok) throw new Error(`Alerts API HTTP ${response.status}`);
  return response.json();
}

export function connectAlertStream({ onNewAlert, onResolved, onConnect, onError } = {}) {
  const socket = io(ALERT_API, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => onConnect?.(socket.id));
  socket.on('alert:new', (alert) => onNewAlert?.(alert));
  socket.on('alert:resolved', (alert) => onResolved?.(alert));
  socket.on('connect_error', (error) => onError?.(error));
  return () => socket.disconnect();
}
