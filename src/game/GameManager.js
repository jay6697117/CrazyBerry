import { Player } from '../entities/Player.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { CropSystem } from './CropSystem.js';
import { GridSystem } from './GridSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { ShopSystem } from './ShopSystem.js';
import { TimeSystem } from './TimeSystem.js';
import { ToolAdvisor } from './ToolAdvisor.js';
import { collectTasks, pickNextTask, computeSeedPurchaseCount } from './AutoFarmPlanner.js';
import { createNoopEffects, EffectsSystem } from '../rendering/Effects.js';
import { FieldRenderer } from '../rendering/FieldRenderer.js';
import { createSceneSetup } from '../rendering/SceneSetup.js';
import { HUD } from '../ui/HUD.js';
import { ShopUI } from '../ui/ShopUI.js';
import { Toolbar } from '../ui/Toolbar.js';
import { computeMoveVector, Input } from '../utils/Input.js';
import {
  ACTION_SOUND_TYPES,
  AUTO_FARM_POLICY,
  CROP_STAGE_THRESHOLDS,
  ECONOMY,
  GRID_COLS,
  GRID_MAX_ROWS,
  GRID_ROWS,
  GRID_TILE_SIZE,
  SAVE_VERSION,
  TOOL_TYPES
} from '../utils/Constants.js';

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function createHeadlessInputStub() {
  return {
    getMovementState() {
      return { up: false, down: false, left: false, right: false };
    },
    consumeActionKey() {
      return false;
    },
    consumePointer() {
      return null;
    },
    destroy() {}
  };
}

function createHeadlessToolbarStub() {
  return {
    setActiveTool() {},
    setAutoFarmEnabled() {},
    setOnToolSelected() {},
    setOnAutoFarmToggle() {},
    setOnResetSave() {},
    setEconomyState() {}
  };
}

function createHeadlessHUDStub() {
  return {
    setState() {}
  };
}

function createHeadlessShopUIStub() {
  return {
    setState() {},
    open() {},
    close() {}
  };
}

function stageToGrowthDays(stage) {
  if (stage >= 5) return CROP_STAGE_THRESHOLDS[4];
  if (stage >= 4) return CROP_STAGE_THRESHOLDS[3];
  if (stage >= 3) return CROP_STAGE_THRESHOLDS[2];
  if (stage >= 2) return CROP_STAGE_THRESHOLDS[1];
  return CROP_STAGE_THRESHOLDS[0];
}

export class GameManager {
  constructor({ headless = false, rng = Math.random } = {}) {
    this.headless = headless;
    this.rng = rng;

    this.gridSystem = new GridSystem({ rows: GRID_ROWS, cols: GRID_COLS, tileSize: GRID_TILE_SIZE });
    this.cropSystem = new CropSystem();
    this.timeSystem = new TimeSystem();
    this.shopSystem = new ShopSystem();
    this.saveSystem = new SaveSystem();
    this.toolAdvisor = new ToolAdvisor();
    this.audioSystem = new AudioSystem({ enabled: !headless });
    this.effects = createNoopEffects();

    this.manualTool = null;
    this.currentHint = 'WASD 移动，空格键操作，点击地块';
    this.pendingFieldRefresh = true;
    this.running = false;
    this.lastTimeMs = 0;
    this.timeMultiplier = 1;
    this.autoFarmEnabled = false;
    this.autoTarget = null;
    this.autoActionCooldownSeconds = 0;
    this.autoTradeCooldownSeconds = 0;
    this.autoActionCount = 0;
    this.autoTradeCount = 0;
    this.autoArrivalDistance = 0.16;
    this.autoExpansionPressureDays = 0;
    this.autoRiskLevel = 'stable';
    this.autoLastSpeedGuardDay = 0;
    this.player = new Player({ headless: true, speed: 4 });
  }

  async init() {
    this.timeSystemUnsubscribe = this.timeSystem.onDayEnd(() => {
      this.handleDayEnd();
    });

    const canRender = !this.headless && typeof window !== 'undefined' && typeof document !== 'undefined';

    if (canRender) {
      this.canvas = document.getElementById('game-canvas');
      this.sceneSetup = await createSceneSetup(this.canvas);
      this.THREE = this.sceneSetup.THREE;
      this.renderer = this.sceneSetup.renderer;
      this.scene = this.sceneSetup.scene;
      this.camera = this.sceneSetup.camera;
      this.sun = this.sceneSetup.sun;

      this.player = new Player({ THREE: this.THREE, speed: 4 });
      this.scene.add(this.player.group);

      this.fieldRenderer = new FieldRenderer({
        THREE: this.THREE,
        scene: this.scene,
        gridSystem: this.gridSystem,
        cropSystem: this.cropSystem
      });

      this.effects = new EffectsSystem({
        THREE: this.THREE,
        scene: this.scene,
        poolSize: 112
      });

      this.raycaster = new this.THREE.Raycaster();
      this.ndc = new this.THREE.Vector2();
      this.cameraForward = new this.THREE.Vector3(0, 0, 1);

      this.input = new Input(window, document);
      this.hud = new HUD(document, {
        onTimeSpeedUp: () => {
          this.timeMultiplier *= 2;
          if (this.timeMultiplier > 64) {
            this.timeMultiplier = 1;
          }
          this.syncUi();
        }
      });
      this.toolbar = new Toolbar(document.getElementById('toolbar'));
      this.toolbar.setOnToolSelected((tool) => {
        this.manualTool = tool;
        if (this.autoFarmEnabled) {
          this.setAutoFarmEnabled(false, 'manual');
        }
        this.player.setTool(tool);
        this.toolbar.setActiveTool(tool);
      });
      this.toolbar.setOnAutoFarmToggle((enabled) => {
        this.setAutoFarmEnabled(enabled, 'toolbar');
      });
      this.toolbar.setOnResetSave(() => {
        this.handleResetSave();
      });
      this.toolbar.setAutoFarmEnabled(false);

      this.shopUI = new ShopUI(document.getElementById('shop-modal'), {
        onBuySeeds: (count) => {
          const success = this.shopSystem.buySeed(count);
          if (!success) this.currentHint = '金币不足，无法购买种子';
          this.syncUi();
        },
        onBuyCan: () => {
          const success = this.shopSystem.buyWateringCanUpgrade();
          if (!success) this.currentHint = '金币不足，无法升级水壶';
          this.syncUi();
        },
        onBuyExpand: () => {
          if (this.gridSystem.rows >= GRID_MAX_ROWS) {
            this.currentHint = '农场已达到最大行数';
            this.syncUi();
            return;
          }

          const success = this.shopSystem.buyFarmExpansion();
          if (!success) {
            this.currentHint = '金币不足，无法扩建农场';
          } else {
            this.gridSystem.expandRows(1);
            this.pendingFieldRefresh = true;
            this.currentHint = '农场已扩建 +1 行';
          }
          this.syncUi();
        },
        onSellNormal: () => {
          this.shopSystem.sellStrawberry({ normalCount: 1, premiumCount: 0 });
          this.syncUi();
        },
        onSellPremium: () => {
          this.shopSystem.sellStrawberry({ normalCount: 0, premiumCount: 1 });
          this.syncUi();
        }
      });

      this.beforeUnloadHandler = () => {
        this.saveSystem.save(this.getSnapshot());
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);

      await this.audioSystem.init();
    } else {
      this.input = createHeadlessInputStub();
      this.hud = createHeadlessHUDStub();
      this.toolbar = createHeadlessToolbarStub();
      this.shopUI = createHeadlessShopUIStub();
      this.cameraForward = { x: 0, y: 0, z: 1 };
      await this.audioSystem.init();
    }

    const savedSnapshot = this.saveSystem.load();
    if (savedSnapshot) {
      this.restoreSnapshot(savedSnapshot);
    }

    this.syncUi();
    return this;
  }

  start() {
    if (!this.renderer || this.running) return;
    this.running = true;
    this.lastTimeMs = 0;

    this.renderer.setAnimationLoop((timeMs) => {
      if (!this.lastTimeMs) {
        this.lastTimeMs = timeMs;
      }
      const dt = Math.min((timeMs - this.lastTimeMs) / 1000, 0.1);
      this.lastTimeMs = timeMs;
      this.update(dt);
      const composer = this.sceneSetup?.composer;
      if (composer?.render) {
        composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  stop() {
    this.running = false;
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
    this.input?.destroy?.();
    if (typeof window !== 'undefined' && this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  update(deltaSeconds) {
    const timeState = this.timeSystem.update(deltaSeconds * this.timeMultiplier);
    this.updateLighting(timeState.phase);

    const zoomDelta = this.input.consumeZoomDelta?.() || 0;
    if (Math.abs(zoomDelta) > 0 && this.camera?.zoom) {
      // 通过滚轮增量调整缩放比例，向上滚 (deltaY<0) 放大，向下滚 (deltaY>0) 缩小
      this.camera.zoom *= (1 - zoomDelta * 0.001);
      this.camera.zoom = Math.max(0.4, Math.min(this.camera.zoom, 3.0));
      this.camera.updateProjectionMatrix();
    }

    const movement = this.input.getMovementState();
    const hasMovementInput = movement.up || movement.down || movement.left || movement.right;
    const actionQueued = this.input.consumeActionKey();
    const pointer = this.input.consumePointer();
    const hasManualInput = hasMovementInput || actionQueued || Boolean(pointer);

    if (this.autoFarmEnabled && hasManualInput) {
      this.setAutoFarmEnabled(false, 'manual');
    }

    if (this.autoFarmEnabled) {
      this.runAutoFarm(deltaSeconds);
    } else {
      if (hasMovementInput) {
        if (this.camera?.getWorldDirection) {
          this.camera.getWorldDirection(this.cameraForward);
        }

        const move = computeMoveVector({
          input: movement,
          cameraForward: this.cameraForward,
          speed: this.player.speed,
          dt: deltaSeconds
        });

        this.player.translate(move.x, move.z);
        this.player.faceDirection(move.x, move.z);
        this.clampPlayerToFarm();
      }

      if (actionQueued) {
        const tile = this.gridSystem.worldToTile(this.player.position.x, this.player.position.z);
        if (tile) this.performPrimaryAction(tile.row, tile.col);
      }

      if (pointer) {
        const tile = this.screenToTile(pointer.x, pointer.y);
        if (tile) this.performPrimaryAction(tile.row, tile.col);
      }
    }

    this.effects.update(deltaSeconds);

    if (this.pendingFieldRefresh && this.fieldRenderer) {
      this.fieldRenderer.refreshAll();
      this.pendingFieldRefresh = false;
    }

    this.syncUi();
  }

  screenToTile(screenX, screenY) {
    if (!this.raycaster || !this.ndc || !this.fieldRenderer || !this.renderer || !this.camera) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((screenY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const hits = this.raycaster.intersectObject(this.fieldRenderer.tileMesh);
    if (!hits.length) return null;

    const instanceId = hits[0].instanceId;
    if (typeof instanceId !== 'number') return null;

    const row = Math.floor(instanceId / this.gridSystem.cols);
    const col = instanceId % this.gridSystem.cols;
    return { row, col };
  }

  clampPlayerToFarm() {
    const halfWidth = ((this.gridSystem.cols - 1) * this.gridSystem.tileSize) / 2 + 0.45;
    const halfHeight = ((this.gridSystem.rows - 1) * this.gridSystem.tileSize) / 2 + 0.45;

    const clampedX = Math.max(-halfWidth, Math.min(halfWidth, this.player.position.x));
    const clampedZ = Math.max(-halfHeight, Math.min(halfHeight, this.player.position.z));

    if (clampedX !== this.player.position.x || clampedZ !== this.player.position.z) {
      this.player.setPosition(clampedX, this.player.position.y, clampedZ);
    }
  }

  setAutoFarmEnabled(enabled, reason = 'toggle') {
    const nextEnabled = Boolean(enabled);
    if (this.autoFarmEnabled === nextEnabled) return;

    this.autoFarmEnabled = nextEnabled;
    this.autoTarget = null;
    this.autoActionCooldownSeconds = 0;
    this.autoTradeCooldownSeconds = 0;
    this.autoRiskLevel = 'stable';

    if (nextEnabled) {
      this.manualTool = null;
      this.currentHint = 'Auto farm enabled';
      this.toolbar.setActiveTool(null);
    } else if (reason === 'manual') {
      this.currentHint = 'Manual control resumed';
    } else {
      this.currentHint = 'Auto farm disabled';
    }

    this.toolbar.setAutoFarmEnabled(nextEnabled);
    this.syncUi();
  }

  handleResetSave() {
    const shouldReset = typeof window === 'undefined' || typeof window.confirm !== 'function'
      ? true
      : window.confirm('确认新开档？当前进度将被清空。');
    if (!shouldReset) return false;
    this.resetToNewSave();
    return true;
  }

  resetToNewSave() {
    this.autoFarmEnabled = false;
    this.autoTarget = null;
    this.autoActionCooldownSeconds = 0;
    this.autoTradeCooldownSeconds = 0;
    this.autoActionCount = 0;
    this.autoTradeCount = 0;
    this.autoExpansionPressureDays = 0;
    this.autoRiskLevel = 'stable';
    this.autoLastSpeedGuardDay = 0;
    this.timeMultiplier = 1;

    this.manualTool = null;
    this.toolbar.setAutoFarmEnabled(false);
    this.toolbar.setActiveTool(null);

    this.timeSystem.setDayNumber(1);
    this.timeSystem.setTimeRatio(0);

    const freshGrid = new GridSystem({ rows: GRID_ROWS, cols: GRID_COLS, tileSize: GRID_TILE_SIZE });
    this.gridSystem.restore(freshGrid.snapshot());
    this.cropSystem.restore({});
    this.shopSystem.restore(new ShopSystem().snapshot());

    this.player.setPosition(0, this.player.position.y ?? 0.8, 0);
    this.shopUI.close();
    this.currentHint = '已新开档';
    this.pendingFieldRefresh = true;

    const freshSnapshot = this.getSnapshot();
    this.saveSystem.clear();
    this.saveSystem.save(freshSnapshot);
    this.syncUi();
    return freshSnapshot;
  }

  countTilledEmptyTiles() {
    return this.getFieldStats().tilledEmptyCount;
  }

  getFieldStats() {
    let activeCropCount = 0;
    let harvestableCount = 0;
    let witheredCount = 0;
    let unwateredGrowingCount = 0;
    let tilledEmptyCount = 0;

    for (let row = 0; row < this.gridSystem.rows; row += 1) {
      for (let col = 0; col < this.gridSystem.cols; col += 1) {
        const tile = this.gridSystem.getTile(row, col);
        if (!tile) continue;

        const crop = this.cropSystem.getCrop(`${row},${col}`);
        if (tile.soilState === 'tilled' && tile.cropId === null) {
          tilledEmptyCount += 1;
        }

        if (!crop) continue;
        if (crop.isWithered) {
          witheredCount += 1;
          continue;
        }

        activeCropCount += 1;
        if (crop.harvestable) {
          harvestableCount += 1;
        } else if (!tile.wateredToday) {
          unwateredGrowingCount += 1;
        }
      }
    }

    return {
      activeCropCount,
      harvestableCount,
      witheredCount,
      unwateredGrowingCount,
      tilledEmptyCount,
      totalTiles: this.gridSystem.rows * this.gridSystem.cols
    };
  }

  updateAutoRiskLevel(fieldStats, economyState) {
    const noRecoverySignal = (
      economyState.coins < ECONOMY.SEED_PRICE &&
      economyState.seedCount === 0 &&
      fieldStats.activeCropCount === 0
    );
    const debtRatio = (economyState.loanDebtTotal ?? 0) / Math.max(1, fieldStats.activeCropCount * 30);
    const stressed = (
      noRecoverySignal ||
      fieldStats.unwateredGrowingCount >= this.gridSystem.cols ||
      debtRatio > AUTO_FARM_POLICY.MAX_DEBT_TO_REVENUE
    );

    this.autoRiskLevel = stressed ? 'stressed' : 'stable';
    return this.autoRiskLevel;
  }

  applyAutoSpeedGuard(fieldStats) {
    if (this.timeMultiplier <= 1) return false;
    const pressureDetected = (
      fieldStats.unwateredGrowingCount >= this.gridSystem.cols ||
      this.autoRiskLevel === 'stressed'
    );
    if (!pressureDetected) return false;

    this.timeMultiplier = 1;
    this.autoLastSpeedGuardDay = this.timeSystem.getDayNumber();
    this.currentHint = 'Auto risk control: speed -> 1x';
    return true;
  }

  shouldAttemptAutoExpansion(fieldStats, economyState) {
    if (this.gridSystem.rows >= GRID_MAX_ROWS) return false;
    if (this.autoExpansionPressureDays < AUTO_FARM_POLICY.EXPANSION_STREAK_DAYS) return false;

    const borrowNeeded = Math.max(0, ECONOMY.FARM_EXPANSION_PRICE - economyState.coins);
    const predictedDebt = (economyState.loanDebtTotal ?? 0) + borrowNeeded;
    const predictedDebtRatio = predictedDebt / Math.max(1, fieldStats.activeCropCount * 30);
    return predictedDebtRatio <= AUTO_FARM_POLICY.MAX_DEBT_TO_REVENUE;
  }

  runAutoShopIfNeeded(fieldStats) {
    if (this.autoTradeCooldownSeconds > 0) return;

    let changed = false;
    const economy = this.shopSystem.getEconomyState();

    if (economy.normalStrawberry > 0 || economy.premiumStrawberry > 0) {
      const sold = this.shopSystem.sellStrawberry({
        normalCount: economy.normalStrawberry,
        premiumCount: economy.premiumStrawberry
      });
      if (sold) {
        changed = true;
        this.currentHint = 'Auto sold harvest';
        this.autoTradeCount += 1;
      }
    }

    let economyAfterSell = this.shopSystem.getEconomyState();
    const baseSeedNeed = Math.max(0, fieldStats.tilledEmptyCount - economyAfterSell.seedCount);
    const targetSeedNeed = baseSeedNeed > 0
      ? Math.max(baseSeedNeed, AUTO_FARM_POLICY.SEED_MIN_BATCH)
      : 0;
    let cappedSeedNeed = Math.min(targetSeedNeed, this.gridSystem.cols);
    if (economyAfterSell.loanDebtTotal > 0) {
      cappedSeedNeed = Math.min(cappedSeedNeed, AUTO_FARM_POLICY.SEED_MIN_BATCH);
    }

    if (cappedSeedNeed > 0) {
      const seedCost = cappedSeedNeed * ECONOMY.SEED_PRICE;
      const seedBorrowGap = Math.max(0, seedCost - economyAfterSell.coins);
      if (seedBorrowGap > 0) {
        const borrowed = this.shopSystem.borrowCoins(seedBorrowGap);
        if (borrowed > 0) {
          changed = true;
          this.autoTradeCount += 1;
        }
      }

      economyAfterSell = this.shopSystem.getEconomyState();
      const buyCount = computeSeedPurchaseCount({
        tilledEmptyCount: cappedSeedNeed,
        seedCount: economyAfterSell.seedCount,
        coins: economyAfterSell.coins,
        seedPrice: ECONOMY.SEED_PRICE,
        maxBuyCount: cappedSeedNeed
      });
      if (buyCount > 0) {
        const bought = this.shopSystem.buySeed(buyCount);
        if (bought) {
          changed = true;
          this.currentHint = `Auto bought ${buyCount} seeds`;
          this.autoTradeCount += 1;
        }
      }
    }

    let expansionReserve = 0;
    let economyAfterSeedBuy = this.shopSystem.getEconomyState();
    const nearExpansionWindow = (
      this.gridSystem.rows < GRID_MAX_ROWS &&
      this.autoExpansionPressureDays >= Math.max(0, AUTO_FARM_POLICY.EXPANSION_STREAK_DAYS - 1)
    );
    if (nearExpansionWindow) {
      expansionReserve = ECONOMY.FARM_EXPANSION_PRICE;
    }

    if (this.shouldAttemptAutoExpansion(fieldStats, economyAfterSeedBuy)) {
      const expansionBorrowGap = Math.max(0, ECONOMY.FARM_EXPANSION_PRICE - economyAfterSeedBuy.coins);
      if (expansionBorrowGap > 0) {
        const borrowed = this.shopSystem.borrowCoins(expansionBorrowGap);
        if (borrowed > 0) {
          changed = true;
          this.autoTradeCount += 1;
        }
      }

      const expanded = this.shopSystem.buyFarmExpansion();
      if (expanded) {
        this.gridSystem.expandRows(1);
        this.pendingFieldRefresh = true;
        this.autoExpansionPressureDays = 0;
        this.currentHint = 'Auto expanded farm +1 row';
        changed = true;
        expansionReserve = 0;
        this.autoTradeCount += 1;
      }
    }

    const economyBeforeRepay = this.shopSystem.getEconomyState();
    const seedBudgetReserve = AUTO_FARM_POLICY.SEED_MIN_BATCH * ECONOMY.SEED_PRICE;
    let reserveTotal = AUTO_FARM_POLICY.OPERATING_CASH_RESERVE + seedBudgetReserve + expansionReserve;
    if (economyBeforeRepay.loanDebtTotal > 0) {
      reserveTotal = ECONOMY.SEED_PRICE;
    }
    const repayable = Math.max(0, economyBeforeRepay.coins - reserveTotal);
    if (repayable > 0 && economyBeforeRepay.loanDebtTotal > 0) {
      const repaid = this.shopSystem.repayLoan(repayable);
      if (repaid > 0) {
        changed = true;
        this.currentHint = `Auto repaid ${repaid}`;
        this.autoTradeCount += 1;
      }
    }

    if (changed) {
      this.autoTradeCooldownSeconds = 0.5;
    }
  }

  movePlayerTowards(targetX, targetZ, deltaSeconds) {
    const dx = targetX - this.player.position.x;
    const dz = targetZ - this.player.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= this.autoArrivalDistance) {
      this.player.setPosition(targetX, this.player.position.y, targetZ);
      return true;
    }

    const maxStep = this.player.speed * deltaSeconds;
    const ratio = Math.min(1, maxStep / distance);
    const moveX = dx * ratio;
    const moveZ = dz * ratio;

    this.player.translate(moveX, moveZ);
    this.player.faceDirection(moveX, moveZ);
    this.clampPlayerToFarm();
    return false;
  }

  runAutoFarm(deltaSeconds) {
    this.autoActionCooldownSeconds = Math.max(0, this.autoActionCooldownSeconds - deltaSeconds);
    this.autoTradeCooldownSeconds = Math.max(0, this.autoTradeCooldownSeconds - deltaSeconds);

    const initialFieldStats = this.getFieldStats();
    const initialEconomyState = this.shopSystem.getEconomyState();
    this.updateAutoRiskLevel(initialFieldStats, initialEconomyState);
    this.applyAutoSpeedGuard(initialFieldStats);

    this.runAutoShopIfNeeded(initialFieldStats);

    const economyState = this.shopSystem.getEconomyState();
    const fieldStats = this.getFieldStats();
    this.updateAutoRiskLevel(fieldStats, economyState);

    const tasks = collectTasks({
      gridSystem: this.gridSystem,
      cropSystem: this.cropSystem,
      playerPosition: this.player.position,
      economyState,
      seedPrice: ECONOMY.SEED_PRICE,
      timeRatio: this.timeSystem.getElapsedRatio(),
      fieldStats,
      strategyState: {
        debtOutstanding: economyState.loanDebtTotal > 0,
        highDebtPressure: economyState.loanDebtTotal > 0 && this.autoRiskLevel === 'stressed'
      }
    });
    const nextTask = pickNextTask(tasks);

    if (!nextTask) {
      this.autoTarget = null;
      this.toolbar.setActiveTool(null);
      this.currentHint = this.autoRiskLevel === 'stressed'
        ? 'Auto risk control'
        : 'Auto farm waiting for tasks';
      return;
    }

    this.autoTarget = { type: nextTask.type, row: nextTask.row, col: nextTask.col };
    this.toolbar.setActiveTool(null);

    const arrived = this.movePlayerTowards(nextTask.worldX, nextTask.worldZ, deltaSeconds);
    if (!arrived || this.autoActionCooldownSeconds > 0) return;

    const result = this.performPrimaryAction(nextTask.row, nextTask.col);
    if (result.success) {
      this.autoActionCount += 1;
    }
    this.autoActionCooldownSeconds = 0.12;
    this.autoTarget = null;
    this.toolbar.setActiveTool(null);
  }

  performPrimaryAction(row, col) {
    const tile = this.gridSystem.getTile(row, col);
    if (!tile) return { success: false, tool: TOOL_TYPES.HAND };

    const tileKey = `${row},${col}`;
    const crop = this.cropSystem.getCrop(tileKey);
    const world = this.gridSystem.tileToWorld(row, col);
    const tool = this.manualTool ?? this.toolAdvisor.recommend(tile, crop);

    let success = false;

    if (tool === TOOL_TYPES.HOE) {
      success = this.gridSystem.tillTile(row, col);
      if (success) {
        this.currentHint = '已开垦地块';
        this.audioSystem.playAction(ACTION_SOUND_TYPES.TILL);
      }
    }

    if (tool === TOOL_TYPES.SEED) {
      if (!this.shopSystem.consumeSeed(1)) {
        const purchased = this.shopSystem.buySeed(1);
        if (!purchased) {
          this.currentHint = '金币不足，无法购买种子';
          this.syncUi();
          return { success: false, tool };
        }
        this.shopSystem.consumeSeed(1);
      }

      const planted = this.gridSystem.plantTile(row, col, 'strawberry');
      if (planted) {
        this.cropSystem.plant(tileKey, this.timeSystem.getDayNumber());
        this.audioSystem.playAction(ACTION_SOUND_TYPES.PLANT);
        success = true;
        this.currentHint = '已播种种子';
      } else {
        this.currentHint = '无法在这里种植';
      }
    }

    if (tool === TOOL_TYPES.WATER) {
      success = this.gridSystem.waterTile(row, col);
      if (success) {
        this.cropSystem.water(tileKey);
        this.effects.spawnWaterSplash(world.x, 0.26, world.z);
        this.audioSystem.playAction(ACTION_SOUND_TYPES.WATER);
        this.currentHint = '已浇水';
      }
    }

    if (tool === TOOL_TYPES.SHOVEL) {
      this.cropSystem.remove(tileKey);
      success = this.gridSystem.clearTile(row, col);
      if (success) {
        this.currentHint = '已清理枯萎的作物';
        this.audioSystem.playAction(ACTION_SOUND_TYPES.TILL);
      }
    }

    if (tool === TOOL_TYPES.HAND) {
      const result = this.cropSystem.harvest(tileKey, this.rng);
      if (result) {
        this.shopSystem.addHarvest(result);
        this.gridSystem.clearTile(row, col);
        this.effects.spawnHarvestSparkle(world.x, 0.5, world.z);
        this.audioSystem.playAction(ACTION_SOUND_TYPES.HARVEST);
        this.currentHint = `收获了 ${result.quality === 'premium' ? '优质' : '普通'}草莓`;
        success = true;
      }
    }

    if (this.autoFarmEnabled) {
      this.toolbar.setActiveTool(null);
      this.player.setTool(null);
    } else {
      this.toolbar.setActiveTool(tool);
      this.player.setTool(tool);
    }
    this.pendingFieldRefresh = true;
    this.syncUi();
    return { success, tool };
  }

  handleDayEnd() {
    const wateredTileKeys = this.gridSystem.getWateredTileKeys();
    this.cropSystem.advanceDay(this.timeSystem.getDayNumber(), wateredTileKeys);
    this.gridSystem.resetWaterFlags();

    const fieldStats = this.getFieldStats();
    const utilization = fieldStats.activeCropCount / Math.max(1, fieldStats.totalTiles);
    if (utilization >= AUTO_FARM_POLICY.EXPANSION_UTILIZATION_THRESHOLD) {
      this.autoExpansionPressureDays += 1;
    } else {
      this.autoExpansionPressureDays = 0;
    }

    const interestAdded = this.shopSystem.accrueLoanInterest(1);
    const baseHint = `第 ${this.timeSystem.getDayNumber()} 天开始了`;
    this.currentHint = interestAdded > 0
      ? `${baseHint} | 贷款计息 +${interestAdded}`
      : baseHint;
    this.pendingFieldRefresh = true;
    this.saveSystem.save(this.getSnapshot());
  }

  updateLighting(phase) {
    if (!this.sun) return;

    if (phase === 'morning') {
      this.sun.color.setHex(0xffe8b6);
      this.sun.intensity = 1.05;
    }
    if (phase === 'noon') {
      this.sun.color.setHex(0xfff9e5);
      this.sun.intensity = 1.18;
    }
    if (phase === 'dusk') {
      this.sun.color.setHex(0xffa261);
      this.sun.intensity = 0.72;
    }
    if (phase === 'night') {
      this.sun.color.setHex(0x5075a8);
      this.sun.intensity = 0.4;
    }
  }

  syncUi() {
    const economyState = this.shopSystem.getEconomyState();
    const strawberryCount = economyState.normalStrawberry + economyState.premiumStrawberry;
    const weather = this.timeSystem.getWeatherState();
    const statusHint = this.autoFarmEnabled
      ? `${this.autoRiskLevel === 'stressed' ? 'Auto: risk control' : 'Auto: stable growth'} | ${this.currentHint}`
      : this.currentHint;

    this.hud.setState({
      dayNumber: this.timeSystem.getDayNumber(),
      phase: titleCase(this.timeSystem.getPhase()),
      clockLabel: this.timeSystem.getClockLabel(),
      weatherIcon: weather.icon,
      coins: economyState.coins,
      debtTotal: economyState.loanDebtTotal ?? 0,
      strawberryCount,
      hint: statusHint,
      timeSpeedMultiplier: this.timeMultiplier
    });

    this.toolbar.setAutoFarmEnabled(this.autoFarmEnabled);
    this.toolbar.setEconomyState(economyState);
    this.shopUI.setState(economyState);
  }

  getSnapshot() {
    const economyState = this.shopSystem.getEconomyState();
    return {
      version: SAVE_VERSION,
      dayNumber: this.timeSystem.getDayNumber(),
      timeOfDay: this.timeSystem.getElapsedRatio(),
      weather: this.timeSystem.getWeatherState().code,
      grid: this.gridSystem.snapshot(),
      crops: this.cropSystem.snapshot(),
      economy: this.shopSystem.snapshot(),
      player: this.player.getPosition(),
      inventory: {
        totalHarvested: economyState.totalHarvested
      }
    };
  }

  restoreSnapshot(snapshot) {
    if (!snapshot || snapshot.version !== SAVE_VERSION) return false;

    this.timeSystem.setDayNumber(snapshot.dayNumber ?? 1);
    this.timeSystem.setTimeRatio(snapshot.timeOfDay ?? 0);

    if (snapshot.grid) this.gridSystem.restore(snapshot.grid);
    if (snapshot.crops) this.cropSystem.restore(snapshot.crops);
    if (snapshot.economy) {
      this.shopSystem.restore(snapshot.economy);
      if (snapshot.economy.farmRows && snapshot.economy.farmRows > this.gridSystem.rows) {
        this.gridSystem.expandRows(snapshot.economy.farmRows - this.gridSystem.rows);
      }
    }

    if (snapshot.player) {
      this.player.setPosition(
        snapshot.player.x ?? 0,
        snapshot.player.y ?? this.player.position.y,
        snapshot.player.z ?? 0
      );
    }

    this.pendingFieldRefresh = true;
    this.syncUi();
    return true;
  }

  createDebugApi() {
    return {
      getPlayerPosition: () => this.player.getPosition(),
      setDay: (dayNumber) => {
        this.timeSystem.setDayNumber(dayNumber);
        this.syncUi();
      },
      setAutoFarmEnabled: (enabled) => {
        this.setAutoFarmEnabled(enabled, 'debug');
        return this.autoFarmEnabled;
      },
      setTimeMultiplier: (multiplier) => {
        const value = Math.max(1, Math.min(64, Math.floor(multiplier)));
        this.timeMultiplier = value;
        this.syncUi();
        return this.timeMultiplier;
      },
      simulateTicks: (ticks, dt = 0.1) => {
        const steps = Math.max(0, Math.floor(ticks));
        const delta = Math.max(0.0001, Number(dt));
        for (let i = 0; i < steps; i += 1) {
          this.update(delta);
        }
        return this.getSnapshot();
      },
      getAutoFarmStatus: () => ({
        enabled: this.autoFarmEnabled,
        target: this.autoTarget ? { ...this.autoTarget } : null,
        actionCount: this.autoActionCount,
        tradeCount: this.autoTradeCount
      }),
      getAutoRuntimeState: () => ({
        riskLevel: this.autoRiskLevel,
        expansionPressureDays: this.autoExpansionPressureDays,
        lastSpeedGuardDay: this.autoLastSpeedGuardDay,
        timeMultiplier: this.timeMultiplier
      }),
      getEconomyState: () => this.shopSystem.getEconomyState(),
      forceTool: (tool) => {
        if (this.autoFarmEnabled) {
          this.setAutoFarmEnabled(false, 'manual');
        }
        this.manualTool = tool;
        this.toolbar.setActiveTool(tool);
      },
      performAction: (row, col) => this.performPrimaryAction(row, col),
      setCropStage: (row, col, stage, withered = false) => {
        const tileKey = `${row},${col}`;
        this.gridSystem.tillTile(row, col);
        if (!this.gridSystem.getTile(row, col).cropId) {
          this.gridSystem.plantTile(row, col, 'strawberry');
          this.cropSystem.plant(tileKey, this.timeSystem.getDayNumber());
        }

        const crop = this.cropSystem.getCrop(tileKey);
        crop.stage = Math.max(1, Math.min(5, Math.floor(stage)));
        crop.growthDays = stageToGrowthDays(crop.stage);
        crop.harvestable = crop.stage === 5 && !withered;
        crop.isWithered = Boolean(withered);
        this.pendingFieldRefresh = true;
        this.syncUi();
        return crop;
      },
      getState: () => this.getSnapshot(),
      resetSave: () => this.resetToNewSave(),
      debugRunFullLoop: () => {
        const oldRng = this.rng;
        this.rng = () => 0.99;
        this.manualTool = null;

        this.performPrimaryAction(0, 0);
        this.performPrimaryAction(0, 0);

        for (let i = 0; i < 10; i += 1) {
          this.gridSystem.waterTile(0, 0);
          this.timeSystem.update(this.timeSystem.dayDurationSeconds);
        }

        this.performPrimaryAction(0, 0);
        this.shopSystem.sellStrawberry({ normalCount: 1, premiumCount: 0 });

        this.rng = oldRng;
        this.pendingFieldRefresh = true;
        this.syncUi();
        return this.getSnapshot();
      }
    };
  }
}
