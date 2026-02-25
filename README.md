# CrazyBerry

A low-poly 3D farming game running directly in browser via strict ES modules.

## Quick Start

```bash
npm install
npm run serve
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Use `W A S D` to move, `Space` to perform context action, click tiles to interact, and use toolbar/shop buttons.

## Tests

```bash
npm run test:unit
npm run test:e2e
npm run test:all
```

## Debug API

Append `?debug=1` and use `window.__crazyberry` in DevTools:

- `getPlayerPosition()`
- `setDay(dayNumber)`
- `forceTool(tool)`
- `performAction(row, col)`
- `getState()`
- `debugRunFullLoop()`
