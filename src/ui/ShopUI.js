export class ShopUI {
  constructor(root, handlers) {
    this.root = root;
    this.handlers = handlers;
    this.stock = root?.querySelector('[data-testid="shop-stock"]');

    if (!root) return;

    const close = root.querySelector('#shop-close');
    const open = document.getElementById('open-shop');
    close?.addEventListener('click', () => this.close());
    open?.addEventListener('click', () => this.open());

    for (const button of root.querySelectorAll('[data-shop-action]')) {
      button.addEventListener('click', () => this.#handleAction(button.dataset.shopAction));
    }
  }

  #handleAction(action) {
    if (!this.handlers) return;
    if (action === 'buy-seed') this.handlers.onBuySeeds?.(1);
    if (action === 'buy-can') this.handlers.onBuyCan?.();
    if (action === 'buy-expand') this.handlers.onBuyExpand?.();
    if (action === 'sell-normal') this.handlers.onSellNormal?.();
    if (action === 'sell-premium') this.handlers.onSellPremium?.();
  }

  setState(economyState) {
    if (!this.stock) return;
    this.stock.textContent = `库存：普通 ${economyState.normalStrawberry} / 优质 ${economyState.premiumStrawberry}`;
  }

  open() {
    if (!this.root) return;
    this.root.dataset.open = 'true';
  }

  close() {
    if (!this.root) return;
    this.root.dataset.open = 'false';
  }
}
