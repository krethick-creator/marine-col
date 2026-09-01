# ORCA marine intelligence app

This project combines the ORCA marine dashboard, multilingual UI support, and the marine intelligence backend.

## The project includes
- React + Vite frontend with multilingual locale support
- Express + TypeScript backend with ORCA agent graph
- Marine weather, alert, and forecast integrations
- Offline-first behavior and cached marine data
- Role-aware dashboard navigation and user modes

## Local development

```bash
npm install
npm run dev
```

## Build verification

```bash
npm run build
npm test
```

## Notes
- The app keeps the existing ORCA features and merges the multilingual branch without removing the current functionality.
- The Feedback page is not reintroduced into the app routes.
