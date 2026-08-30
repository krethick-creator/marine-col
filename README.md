<<<<<<< HEAD
# ORCA Alerts & Warnings — isolated real-time module

This module is designed to be mounted into the existing ORCA backend without replacing the existing dashboard, routes, or HTTP server.

## What is live
- Open-Meteo Marine current wave/swell data.
- Open-Meteo Weather current 10 m wind speed/gust/direction.
- Five Indian coastal points by default: Chennai, Mumbai, Kochi, Visakhapatnam and Goa.
- Background polling (default every 5 minutes) with WebSocket events for new alerts.
- `alert:resolved` is emitted when a previously active alert disappears.
- `/api/alerts` remains available for the dashboard's initial load/polling.

Open-Meteo documents multi-coordinate requests and current marine variables including wave height, wave period, wind-wave and swell-wave heights. Its marine data is model-based and is not a substitute for official nautical/coastal navigation advisories. See https://open-meteo.com/en/docs/marine-weather-api.

## Alert logic
These are configurable application thresholds, not official IMD/INCOIS warning levels:
- Wave > 1.25 m: MEDIUM / CAUTION
- Wave > 2.00 m: HIGH / NO-GO
- Wind 22–<28 km/h: LOW / CAUTION
- Wind 28–<40 km/h: MEDIUM / CAUTION
- Wind >= 40 km/h: HIGH / NO-GO

The API response intentionally contains both `severity` (LOW/MEDIUM/HIGH for the existing Alerts & Warnings UI) and `decisionSeverity` (GO/CAUTION/NO-GO for the backend risk pipeline).

## Install
From the existing backend root:

```bash
npm install socket.io
```

`web-push` and `twilio` are optional and only needed if those flags are enabled.

## Safe integration into the existing server
Do not create a second HTTP server. Use the server that your existing backend already listens on.

```js
const { attachSocketServer } = require('./orca-alerts/services/socketServer');
const alertRoutes = require('./orca-alerts/routes/alertRoutes');
const { start } = require('./orca-alerts/services/realtimeMonitor');

// existing: const server = http.createServer(app);
attachSocketServer(server);
app.use('/api/alerts', alertRoutes);
start();

// existing: server.listen(...)
```

If your existing app already has a `server` variable, do not add another `http.createServer`.

## Frontend: no redesign required
The existing Alerts & Warnings page can remain visually unchanged. Only the data source needs to be connected to `/api/alerts` and, if desired, Socket.IO events.

Socket events:
- `alert:new` — a new/changed alert.
- `alert:resolved` — an alert no longer meets the configured threshold.

Example:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');
socket.on('alert:new', alert => { /* update existing alert list */ });
socket.on('alert:resolved', alert => { /* remove/resolve existing alert */ });
```

## Environment
Copy `.env.example` into the existing backend `.env`.

## Tests

```bash
node test/alertProvider.test.js
```

## Important limitation
This module provides live model data and derives application warnings from thresholds. It does NOT claim that an alert is an official IMD/INCOIS advisory. For production safety/navigation use, an authorized official warning feed should be added as a separate provider and shown as the authoritative source.
=======
# marine-col
ocra
>>>>>>> 78d6419db5679492b518e7194dba6f78579fc796
