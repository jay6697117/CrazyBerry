export class AudioSystem {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
  }

  play(name) {
    if (!this.enabled) return;
    this.lastPlayed = name;
  }
}
