export class Toolbar {
  constructor(root) {
    this.root = root;
    this.toolButtons = root ? Array.from(root.querySelectorAll('[data-tool]')) : [];
    this.seedCounter = root?.querySelector('[data-testid="toolbar-seeds"]') ?? null;
    this.activeToolLabel = root?.querySelector('[data-testid="toolbar-active"]') ?? null;
    this.autoFarmButton = root?.querySelector('[data-testid="toggle-auto-farm"]') ?? null;
    this.resetSaveButton = root?.querySelector('[data-testid="reset-save-btn"]') ?? null;
    this.onToolSelected = null;
    this.onAutoFarmToggle = null;
    this.onResetSave = null;
    this.autoFarmEnabled = false;

    for (const button of this.toolButtons) {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool;
        this.setActiveTool(tool);
        if (this.onToolSelected) this.onToolSelected(tool);
      });
    }

    this.autoFarmButton?.addEventListener('click', () => {
      const next = !this.autoFarmEnabled;
      if (this.onAutoFarmToggle) this.onAutoFarmToggle(next);
    });

    this.resetSaveButton?.addEventListener('click', () => {
      if (this.onResetSave) this.onResetSave();
    });
  }

  setOnToolSelected(handler) {
    this.onToolSelected = handler;
  }

  setOnAutoFarmToggle(handler) {
    this.onAutoFarmToggle = handler;
  }

  setOnResetSave(handler) {
    this.onResetSave = handler;
  }

  setAutoFarmEnabled(enabled) {
    this.autoFarmEnabled = Boolean(enabled);
    if (!this.autoFarmButton) return;
    this.autoFarmButton.dataset.active = String(this.autoFarmEnabled);
    this.autoFarmButton.setAttribute('aria-pressed', String(this.autoFarmEnabled));
  }

  setActiveTool(tool) {
    for (const button of this.toolButtons) {
      button.dataset.active = String(button.dataset.tool === tool);
    }

    if (this.activeToolLabel) {
      const toolMap = {
        'hoe': '锄头',
        'seed': '种子',
        'water': '水壶',
        'shovel': '镰刀',
        'hand': '小手'
      };
      const displayTool = tool ? toolMap[tool] || tool : '自动';
      this.activeToolLabel.textContent = `工具：${displayTool}`;
    }
  }

  setEconomyState(economyState) {
    if (this.seedCounter) {
      this.seedCounter.textContent = String(economyState.seedCount ?? 0);
    }
  }
}
