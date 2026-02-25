import { SAVE_KEY, SAVE_VERSION } from '../utils/Constants.js';

function createMemoryStorage() {
  const memory = new Map();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key)
  };
}

export class SaveSystem {
  constructor({ storage } = {}) {
    if (storage) {
      this.storage = storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = createMemoryStorage();
    }
  }

  save(snapshot) {
    this.storage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  }

  load() {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.version !== SAVE_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  clear() {
    this.storage.removeItem(SAVE_KEY);
  }
}
