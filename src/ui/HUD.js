export class HUD {
  constructor(root = document) {
    this.day = root.querySelector('[data-testid="hud-day"]');
    this.phase = root.querySelector('[data-testid="hud-phase"]');
    this.coins = root.querySelector('[data-testid="hud-coins"]');
    this.strawberry = root.querySelector('[data-testid="hud-strawberry"]');
    this.hint = root.querySelector('[data-testid="hud-hint"]');
  }

  setState({ dayNumber, phase, coins, strawberryCount, hint }) {
    if (this.day) this.day.textContent = `Day ${dayNumber}`;
    if (this.phase) this.phase.textContent = phase;
    if (this.coins) this.coins.textContent = `${coins}`;
    if (this.strawberry) this.strawberry.textContent = `${strawberryCount}`;
    if (this.hint && hint) this.hint.textContent = hint;
  }
}
