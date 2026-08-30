const flags = require('../config/featureFlags');
const LOCATIONS = require('../config/coastalLocations');

const MARINE_API = 'https://marine-api.open-meteo.com/v1/marine';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

// These are application/demo thresholds, NOT official IMD/INCOIS advisories.
const WAVE = { caution: 1.25, danger: 2.0 }; // metres
const WIND = { low: 22, caution: 28, danger: 40 }; // km/h, sustained 10 m wind

let lastKnownGood = {
  source: 'cache',
  fetchedAt: null,
  live: false,
  degraded: true,
  conditions: [],
  alerts: [],
};

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('feed_timeout')), ms));
}

async function fetchJson(url) {
  const response = await Promise.race([fetch(url), timeout(flags.ALERT_FEED_TIMEOUT_MS)]);
  if (!response.ok) throw new Error(`http_${response.status}`);
  return response.json();
}

function coords() {
  return {
    latitude: LOCATIONS.map((x) => x.lat).join(','),
    longitude: LOCATIONS.map((x) => x.lon).join(','),
  };
}

async function fetchLiveConditions() {
  const { latitude, longitude } = coords();

  const marineUrl = new URL(MARINE_API);
  marineUrl.searchParams.set('latitude', latitude);
  marineUrl.searchParams.set('longitude', longitude);
  marineUrl.searchParams.set('current', 'wave_height,wave_period,swell_wave_height,wind_wave_height,wave_direction');
  marineUrl.searchParams.set('timezone', 'auto');

  const weatherUrl = new URL(WEATHER_API);
  weatherUrl.searchParams.set('latitude', latitude);
  weatherUrl.searchParams.set('longitude', longitude);
  weatherUrl.searchParams.set('current', 'wind_speed_10m,wind_gusts_10m,wind_direction_10m');
  weatherUrl.searchParams.set('timezone', 'auto');

  const [marine, weather] = await Promise.all([fetchJson(marineUrl), fetchJson(weatherUrl)]);
  const marineRows = Array.isArray(marine) ? marine : [marine];
  const weatherRows = Array.isArray(weather) ? weather : [weather];

  return LOCATIONS.map((location, index) => {
    const m = marineRows[index]?.current || {};
    const w = weatherRows[index]?.current || {};
    return {
      location,
      observedAt: m.time || w.time || null,
      waveHeight: numberOrNull(m.wave_height),
      wavePeriod: numberOrNull(m.wave_period),
      waveDirection: numberOrNull(m.wave_direction),
      swellWaveHeight: numberOrNull(m.swell_wave_height),
      windWaveHeight: numberOrNull(m.wind_wave_height),
      windSpeed: numberOrNull(w.wind_speed_10m),
      windGust: numberOrNull(w.wind_gusts_10m),
      windDirection: numberOrNull(w.wind_direction_10m),
    };
  });
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function makeAlert({ location, observedAt, type, severity, decision, message, raw }) {
  const validTo = observedAt ? new Date(new Date(observedAt).getTime() + 60 * 60 * 1000).toISOString() : null;
  return {
    id: `${location.id}:${type}:${observedAt || 'now'}:${severity}`,
    type,
    severity,                 // UI-friendly: LOW | MEDIUM | HIGH
    decisionSeverity: decision, // pipeline-friendly: CAUTION | NO-GO
    region: location.name,
    message,
    source: type === 'HIGH_WAVE' ? 'Open-Meteo Marine' : 'Open-Meteo Weather',
    issuedAt: observedAt,
    validFrom: observedAt,
    validTo,
    raw,
  };
}

function buildAlerts(conditions) {
  const alerts = [];
  for (const c of conditions) {
    if (c.waveHeight != null) {
      if (c.waveHeight > WAVE.danger) {
        alerts.push(makeAlert({
          location: c.location,
          observedAt: c.observedAt,
          type: 'HIGH_WAVE', severity: 'HIGH', decision: 'NO-GO',
          message: `High wave advisory: ${c.waveHeight.toFixed(1)} m waves at ${c.location.name}.`, raw: c,
        }));
      } else if (c.waveHeight > WAVE.caution) {
        alerts.push(makeAlert({
          location: c.location,
          observedAt: c.observedAt,
          type: 'HIGH_WAVE', severity: 'MEDIUM', decision: 'CAUTION',
          message: `High wave advisory: ${c.waveHeight.toFixed(1)} m waves at ${c.location.name}.`, raw: c,
        }));
      }
    }

    if (c.windSpeed != null) {
      if (c.windSpeed >= WIND.danger) {
        alerts.push(makeAlert({
          location: c.location,
          observedAt: c.observedAt,
          type: 'STRONG_WIND', severity: 'HIGH', decision: 'NO-GO',
          message: `Strong wind warning: sustained wind ${c.windSpeed.toFixed(0)} km/h at ${c.location.name}` + (c.windGust != null ? `, gusts ${c.windGust.toFixed(0)} km/h.` : '.'), raw: c,
        }));
      } else if (c.windSpeed >= WIND.caution) {
        alerts.push(makeAlert({
          location: c.location,
          observedAt: c.observedAt,
          type: 'STRONG_WIND', severity: 'MEDIUM', decision: 'CAUTION',
          message: `Strong wind warning: sustained wind ${c.windSpeed.toFixed(0)} km/h at ${c.location.name}` + (c.windGust != null ? `, gusts ${c.windGust.toFixed(0)} km/h.` : '.'), raw: c,
        }));
      } else if (c.windSpeed >= WIND.low) {
        alerts.push(makeAlert({
          location: c.location,
          observedAt: c.observedAt,
          type: 'STRONG_WIND', severity: 'LOW', decision: 'CAUTION',
          message: `Strong wind watch: sustained wind ${c.windSpeed.toFixed(0)} km/h at ${c.location.name}.`, raw: c,
        }));
      }
    }
  }
  return alerts;
}

async function getAlertFeed() {
  if (!flags.ALERT_LIVE_FEED_ENABLED) {
    return { ...lastKnownGood, source: 'disabled', live: false, degraded: false };
  }

  try {
    const conditions = await fetchLiveConditions();
    const normalized = {
      source: 'open-meteo-live',
      fetchedAt: new Date().toISOString(),
      live: true,
      degraded: false,
      conditions,
      alerts: buildAlerts(conditions),
    };
    lastKnownGood = normalized;
    return normalized;
  } catch (error) {
    console.error('[alertProvider] live feed unavailable:', error.message);
    return { ...lastKnownGood, live: false, degraded: true, error: error.message };
  }
}

async function healthCheck() {
  if (!flags.ALERT_LIVE_FEED_ENABLED) return { status: 'disabled', live: false };
  try {
    const conditions = await fetchLiveConditions();
    return { status: 'ok', live: true, source: 'open-meteo-live', locations: conditions.length, checkedAt: new Date().toISOString() };
  } catch (error) {
    return { status: 'degraded', live: false, source: 'open-meteo-live', error: error.message, checkedAt: new Date().toISOString() };
  }
}

module.exports = { getAlertFeed, healthCheck, buildAlerts, fetchLiveConditions };
