import { AUTO_FARM_POLICY, ECONOMY, GRID_ROWS } from '../utils/Constants.js';

export class ShopSystem {
  constructor({ coins = ECONOMY.START_COINS } = {}) {
    this.coins = coins;
    this.seedCount = 0;
    this.normalStrawberry = 0;
    this.premiumStrawberry = 0;
    this.farmRows = GRID_ROWS;
    this.wateringCanLevel = 1;
    this.totalHarvested = 0;
    this.loanPrincipal = 0;
    this.loanInterestAccrued = 0;
  }

  addHarvest({ quantity, quality }) {
    if (quality === 'premium') {
      this.premiumStrawberry += quantity;
    } else {
      this.normalStrawberry += quantity;
    }
    this.totalHarvested += quantity;
  }

  consumeSeed(count = 1) {
    if (this.seedCount < count) return false;
    this.seedCount -= count;
    return true;
  }

  buySeed(count = 1) {
    const total = ECONOMY.SEED_PRICE * count;
    if (this.coins < total) return false;
    this.coins -= total;
    this.seedCount += count;
    return true;
  }

  sellStrawberry({ normalCount, premiumCount }) {
    if (normalCount > this.normalStrawberry) return false;
    if (premiumCount > this.premiumStrawberry) return false;

    this.normalStrawberry -= normalCount;
    this.premiumStrawberry -= premiumCount;
    this.coins += normalCount * ECONOMY.SELL_NORMAL + premiumCount * ECONOMY.SELL_PREMIUM;
    return true;
  }

  buyWateringCanUpgrade() {
    if (this.coins < ECONOMY.WATERING_CAN_UPGRADE_PRICE) return false;
    this.coins -= ECONOMY.WATERING_CAN_UPGRADE_PRICE;
    this.wateringCanLevel += 1;
    return true;
  }

  buyFarmExpansion() {
    if (this.coins < ECONOMY.FARM_EXPANSION_PRICE) return false;
    this.coins -= ECONOMY.FARM_EXPANSION_PRICE;
    this.farmRows += 1;
    return true;
  }

  getLoanState() {
    const principal = Math.max(0, Math.floor(this.loanPrincipal));
    const interest = Math.max(0, Math.floor(this.loanInterestAccrued));
    return {
      principal,
      interest,
      totalDebt: principal + interest
    };
  }

  getLoanLimit() {
    const extraRows = Math.max(0, this.farmRows - GRID_ROWS);
    return AUTO_FARM_POLICY.LOAN_BASE_LIMIT + extraRows * AUTO_FARM_POLICY.LOAN_PER_EXTRA_ROW;
  }

  borrowCoins(amount) {
    const requested = Math.max(0, Math.floor(amount));
    if (requested === 0) return 0;

    const loanState = this.getLoanState();
    const remainingLimit = Math.max(0, this.getLoanLimit() - loanState.totalDebt);
    const approved = Math.min(requested, remainingLimit);
    if (approved <= 0) return 0;

    this.coins += approved;
    this.loanPrincipal += approved;
    return approved;
  }

  accrueLoanInterest(days = 1) {
    const normalizedDays = Math.max(0, Math.floor(days));
    if (normalizedDays === 0 || this.loanPrincipal <= 0) return 0;

    const addedInterest = Math.ceil(this.loanPrincipal * AUTO_FARM_POLICY.LOAN_DAILY_RATE * normalizedDays);
    if (addedInterest <= 0) return 0;

    this.loanInterestAccrued += addedInterest;
    return addedInterest;
  }

  repayLoan(maxPayment = Number.POSITIVE_INFINITY) {
    const paymentCap = Math.max(0, Math.floor(maxPayment));
    if (paymentCap === 0 || this.coins <= 0) return 0;

    let remaining = Math.min(paymentCap, this.coins);
    if (remaining <= 0) return 0;

    const interestPaid = Math.min(remaining, this.loanInterestAccrued);
    this.loanInterestAccrued -= interestPaid;
    remaining -= interestPaid;

    const principalPaid = Math.min(remaining, this.loanPrincipal);
    this.loanPrincipal -= principalPaid;
    remaining -= principalPaid;

    const paidTotal = interestPaid + principalPaid;
    this.coins -= paidTotal;
    return paidTotal;
  }

  getEconomyState() {
    const loanState = this.getLoanState();
    return {
      coins: this.coins,
      seedCount: this.seedCount,
      normalStrawberry: this.normalStrawberry,
      premiumStrawberry: this.premiumStrawberry,
      farmRows: this.farmRows,
      wateringCanLevel: this.wateringCanLevel,
      totalHarvested: this.totalHarvested,
      loanPrincipal: loanState.principal,
      loanInterestAccrued: loanState.interest,
      loanDebtTotal: loanState.totalDebt
    };
  }

  snapshot() {
    return this.getEconomyState();
  }

  restore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    this.coins = snapshot.coins ?? this.coins;
    this.seedCount = snapshot.seedCount ?? this.seedCount;
    this.normalStrawberry = snapshot.normalStrawberry ?? this.normalStrawberry;
    this.premiumStrawberry = snapshot.premiumStrawberry ?? this.premiumStrawberry;
    this.farmRows = snapshot.farmRows ?? this.farmRows;
    this.wateringCanLevel = snapshot.wateringCanLevel ?? this.wateringCanLevel;
    this.totalHarvested = snapshot.totalHarvested ?? this.totalHarvested;
    this.loanPrincipal = Math.max(0, Math.floor(snapshot.loanPrincipal ?? this.loanPrincipal ?? 0));
    this.loanInterestAccrued = Math.max(0, Math.floor(snapshot.loanInterestAccrued ?? this.loanInterestAccrued ?? 0));
    return true;
  }
}
