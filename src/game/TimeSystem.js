import { DAY_DURATION_SECONDS, WEATHER_CYCLE } from '../utils/Constants.js';

export class TimeSystem {
  constructor({ dayDurationSeconds = DAY_DURATION_SECONDS } = {}) {
    this.dayDurationSeconds = dayDurationSeconds;
    this.dayNumber = 1;
    this.elapsedInDay = 0;
    this.listeners = new Set();
  }

  onDayEnd(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(deltaSeconds) {
    this.elapsedInDay += deltaSeconds;
    let dayAdvanced = false;

    while (this.elapsedInDay >= this.dayDurationSeconds) {
      this.elapsedInDay -= this.dayDurationSeconds;
      this.dayNumber += 1;
      dayAdvanced = true;
      for (const listener of this.listeners) {
        listener(this.dayNumber);
      }
    }

    return { dayAdvanced, phase: this.getPhase() };
  }

  getDayNumber() {
    return this.dayNumber;
  }

  setDayNumber(dayNumber) {
    this.dayNumber = Math.max(1, Math.floor(dayNumber));
  }

  getElapsedRatio() {
    return this.elapsedInDay / this.dayDurationSeconds;
  }

  setTimeRatio(ratio) {
    const clamped = Math.max(0, Math.min(0.9999, ratio));
    this.elapsedInDay = clamped * this.dayDurationSeconds;
  }

  getPhase() {
    const ratio = this.getElapsedRatio();
    if (ratio < 0.25) return 'morning';
    if (ratio < 0.5) return 'noon';
    if (ratio < 0.75) return 'dusk';
    return 'night';
  }

  getWeatherState() {
    return WEATHER_CYCLE[(this.dayNumber - 1) % WEATHER_CYCLE.length];
  }

  getClockLabel() {
    const dayMinutes = 24 * 60;
    const base = 6 * 60;
    const current = Math.floor((base + this.getElapsedRatio() * dayMinutes) % dayMinutes);
    const hour24 = Math.floor(current / 60);
    const minute = current % 60;
    const prefix = hour24 >= 12 ? '下午' : '上午';
    const hour12 = hour24 % 12 || 12;
    return `${prefix} ${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}
