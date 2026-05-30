# Compass Dashboard (Zip Port)

Frontend demo for Compass (Monad MCP Security Proxy), ported from:

- `/Users/rcarnicer/Downloads/compass.zip`
- extracted source: `/tmp/compass-download-zip/compass`

## Stack
- React + TypeScript + Vite
- CSS tokens (ported from zip `tokens.css`)

## Run
```bash
cd packages/dashboard
npm install
npm run dev
```

Build:
```bash
npm run build
npm run preview
```

## Notes
- This is a mocked/demo dashboard (no backend integration).
- Monad network shown as **Monad Testnet (Chain ID 10143)**.
- UI includes Overview / Audit Trail / Policies, proxy topology, live-ish feed simulation, decision deep-dive, balance deltas, risk checks, policy cards, and delegated access revoke controls.
