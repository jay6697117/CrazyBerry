export class HUD {
  constructor(root = document, { onTimeSpeedUp } = {}) {
    this.day = root.querySelector('[data-testid="hud-day"]');
    this.phase = root.querySelector('[data-testid="hud-phase"]');
    this.clock = root.querySelector('[data-testid="hud-clock"]');
    this.weather = root.querySelector('[data-testid="hud-weather"]');
    this.coins = root.querySelector('[data-testid="hud-coins"]');
    this.strawberry = root.querySelector('[data-testid="hud-strawberry"]');
    this.hint = root.querySelector('[data-testid="hud-hint"]');
    this.timeSpeedBtn = root.querySelector('[data-testid="time-speed-btn"]');

    if (this.timeSpeedBtn && onTimeSpeedUp) {
      this.timeSpeedBtn.addEventListener('click', onTimeSpeedUp);
    }
  }

  setState({ dayNumber, phase, clockLabel, weatherIcon, coins, strawberryCount, hint, timeSpeedMultiplier }) {
    if (this.day) this.day.textContent = `第 ${dayNumber} 天`;
    const phaseMap = { 'Morning': '清晨', 'Noon': '中午', 'Dusk': '黄昏', 'Night': '夜晚' };
    const displayPhase = phaseMap[phase] || phase;
    if (this.phase) this.phase.textContent = displayPhase;
    if (this.clock) this.clock.textContent = clockLabel;
    if (this.weather) this.weather.textContent = weatherIcon;
    if (this.coins) this.coins.textContent = `${coins}`;
    if (this.strawberry) this.strawberry.textContent = `${strawberryCount}`;
    if (this.hint && hint) this.hint.textContent = hint;
    if (this.timeSpeedBtn && timeSpeedMultiplier) {
      this.timeSpeedBtn.textContent = `${timeSpeedMultiplier}x`;
    }
  }
}
