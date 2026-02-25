import { GameManager } from './game/GameManager.js';

export async function bootstrapGame({ headless = false, autoStart = true } = {}) {
  const game = new GameManager({ headless });
  await game.init();
  if (autoStart && !headless) {
    game.start();
  }
  return game;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const alreadyBooted = window.__CRAZYBERRY_BOOTED__ === true;
  if (!alreadyBooted) {
    window.__CRAZYBERRY_BOOTED__ = true;
    const search = new URLSearchParams(window.location.search);
    const debug = search.get('debug') === '1';
    const game = await bootstrapGame({ headless: false, autoStart: true });
    if (debug) {
      window.__crazyberry = game.createDebugApi();
    }
  }
}
