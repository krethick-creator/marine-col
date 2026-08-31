const { getAlertFeed } = require('./alertProvider');
const { dispatchNotification } = require('../services/notificationService');

const notifiedAlertIds = new Set();
const RANK = { GO: 0, CAUTION: 1, 'NO-GO': 2 };

function worstSeverity(alerts) {
  return alerts.reduce((worst, alert) => {
    const decision = alert.decisionSeverity || 'CAUTION';
    return RANK[decision] > RANK[worst] ? decision : worst;
  }, 'GO');
}

async function run(context = {}) {
  const feed = await getAlertFeed();
  const severity = worstSeverity(feed.alerts);

  for (const alert of feed.alerts) {
    if (!notifiedAlertIds.has(alert.id)) {
      notifiedAlertIds.add(alert.id);
      dispatchNotification(alert).catch((err) => console.error('[alertAgent] notification:', err.message));
    }
  }

  return {
    agent: 'alert',
    severity,
    live: feed.live,
    degraded: feed.degraded,
    source: feed.source,
    fetchedAt: feed.fetchedAt,
    alerts: feed.alerts,
    conditions: feed.conditions,
    context,
  };
}

module.exports = { run };
