const flags = require('../config/featureFlags');
const alertAgent = require('../agents/alertAgent');
const { notifyResolved } = require('./notificationService');

let timer = null;
let running = false;
let previousActive = new Map();

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await alertAgent.run({ source: 'realtime-monitor' });
    const current = new Map(result.alerts.map((a) => [a.id, a]));
    for (const [id, alert] of previousActive) {
      if (!current.has(id)) notifyResolved(alert);
    }
    previousActive = current;
    return result;
  } catch (error) {
    console.error('[orca-alerts] monitor tick failed:', error.message);
  } finally {
    running = false;
  }
}

function start() {
  if (!flags.ALERT_MONITOR_ENABLED || !flags.ALERT_LIVE_FEED_ENABLED || timer) return;
  if (flags.ALERT_NOTIFY_ON_STARTUP) tick();
  else tick().catch(() => {});
  timer = setInterval(tick, flags.ALERT_POLL_INTERVAL_MS);
  timer.unref?.();
  console.log(`[orca-alerts] live monitor started; interval=${flags.ALERT_POLL_INTERVAL_MS}ms`);
}
function stop() { if (timer) clearInterval(timer); timer = null; }
module.exports = { start, stop, tick };
