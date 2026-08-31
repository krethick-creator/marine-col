const assert = require('node:assert/strict');
const { buildAlerts } = require('../agents/alertProvider');
const location = { id: 'chennai', name: 'Chennai Coast', lat: 13, lon: 80 };

const alerts = buildAlerts([
  { location, observedAt: '2026-08-29T15:00', waveHeight: 2.4, windSpeed: 45, windGust: 55 },
  { location: { ...location, id: 'safe', name: 'Safe Coast' }, observedAt: '2026-08-29T15:00', waveHeight: 0.8, windSpeed: 10, windGust: 15 },
]);
assert.equal(alerts.length, 2);
assert.equal(alerts.find((a) => a.type === 'HIGH_WAVE').decisionSeverity, 'NO-GO');
assert.equal(alerts.find((a) => a.type === 'STRONG_WIND').severity, 'HIGH');
console.log('alertProvider tests passed');
