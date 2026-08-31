function bool(name, fallback = false) {
  const value = process.env[name];
  if (value == null) return fallback;
  return value.toLowerCase() === 'true';
}

module.exports = {
  ALERT_LIVE_FEED_ENABLED: bool('ALERT_LIVE_FEED_ENABLED', true),
  ALERT_MONITOR_ENABLED: bool('ALERT_MONITOR_ENABLED', true),
  ALERT_POLL_INTERVAL_MS: Math.max(30000, Number.parseInt(process.env.ALERT_POLL_INTERVAL_MS || '300000', 10)),
  ALERT_FEED_TIMEOUT_MS: Math.max(2000, Number.parseInt(process.env.ALERT_FEED_TIMEOUT_MS || '8000', 10)),
  ALERT_NOTIFY_ON_STARTUP: bool('ALERT_NOTIFY_ON_STARTUP', false),

  NOTIFY_WEBSOCKET_ENABLED: bool('NOTIFY_WEBSOCKET_ENABLED', true),
  NOTIFY_PUSH_ENABLED: bool('NOTIFY_PUSH_ENABLED', false),
  NOTIFY_SMS_ENABLED: bool('NOTIFY_SMS_ENABLED', false),

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:team@example.com',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || '',
  SMS_RECIPIENTS: process.env.SMS_RECIPIENTS || '',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
