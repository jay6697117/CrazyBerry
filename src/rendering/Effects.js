export function createParticlePool(size) {
  const free = Array.from({ length: size }, () => ({}));
  const used = new Set();

  return {
    acquire() {
      const item = free.pop() ?? {};
      used.add(item);
      return item;
    },
    release(item) {
      if (!used.has(item)) return;
      used.delete(item);
      free.push(item);
    }
  };
}
