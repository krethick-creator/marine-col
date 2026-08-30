const express = require('express');
const router = express.Router();
const alertAgent = require('../agents/alertAgent');
const { healthCheck } = require('../agents/alertProvider');
const { addPushSubscription } = require('../services/notificationService');

router.get('/', async (req, res) => {
  try {
    res.json(await alertAgent.run({ requestedBy: req.ip }));
  } catch (error) {
    console.error('[orca-alerts] route failed:', error.message);
    res.status(200).json({ agent: 'alert', severity: 'CAUTION', degraded: true, live: false, alerts: [], error: 'alert_agent_failed_safe' });
  }
});

router.get('/health', async (_req, res) => res.json(await healthCheck()));

router.post('/push-subscribe', (req, res) => {
  if (!req.body?.endpoint) return res.status(400).json({ error: 'invalid_subscription' });
  addPushSubscription(req.body);
  res.status(201).json({ status: 'subscribed' });
});

module.exports = router;
