export class Toolbar {
  constructor(root) {
    this.root = root;
    this.toolButtons = root ? Array.from(root.querySelectorAll('[data-tool]')) : [];
    this.seedCounter = root?.querySelector('[data-testid="toolbar-seeds"]') ?? null;
    this.activeToolLabel = root?.querySelector('[data-testid="toolbar-active"]') ?? null;
    this.onToolSelected = null;

    for (const button of this.toolButtons) {
      button.addEventListener('click', () => {
        const tool = button.dataset.tool;
        this.setActiveTool(tool);
        if (this.onToolSelected) this.onToolSelected(tool);
      });
    }
  }

  setOnToolSelected(handler) {
    this.onToolSelected = handler;
  }

  setActiveTool(tool) {
    for (const button of this.toolButtons) {
      button.dataset.active = String(button.dataset.tool === tool);
    }

    if (this.activeToolLabel) {
      this.activeToolLabel.textContent = tool ? `Tool: ${tool}` : 'Tool: auto';
    }
  }

  setEconomyState(economyState) {
    if (this.seedCounter) {
      this.seedCounter.textContent = String(economyState.seedCount ?? 0);
    }
  }
}
