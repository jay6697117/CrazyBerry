export class Toolbar {
  constructor(root) {
    this.root = root;
    this.toolButtons = root ? Array.from(root.querySelectorAll('[data-tool]')) : [];
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
  }
}
