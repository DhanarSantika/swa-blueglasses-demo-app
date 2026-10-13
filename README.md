# Blueglasses Demo App

Angular demo host for the SIKAP UI at `/sikap`.

The demo reuses the SIKAP web UI and design system. All business API and Identity calls are replaced by an in-memory demo adapter with synthetic data. No demo changes survive a browser refresh. Do not place real customer, financial, account, or attachment data in this repository.

## Local development

Requirements: Node.js 24 and npm.

```bash
npm ci
npm start
```

Open <http://localhost:4200/sikap>. The demo session uses `demo.owner` with role `OWNER`; the UI shows the demo marker and resets to seeded data after refresh.

## Production build

```bash
npm ci
npm test -- --watch=false
npm run build
```

Azure Static Web Apps serves `dist/blueglasses-demo-app/browser` and rewrites application routes to `index.html`. Configure `demo-app.blueglasses.xyz` on the Azure Static Web App resource and point DNS to its hostname.
