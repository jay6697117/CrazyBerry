import { Player } from '../entities/Player.js';
import { AudioSystem } from '../audio/AudioSystem.js';
import { CropSystem } from './CropSystem.js';
import { GridSystem } from './GridSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { ShopSystem } from './ShopSystem.js';
import { TimeSystem } from './TimeSystem.js';
import { ToolAdvisor } from './ToolAdvisor.js';
import { createParticlePool } from '../rendering/Effects.js';
import { FieldRenderer } from '../rendering/FieldRenderer.js';
import { createSceneSetup } from '../rendering/SceneSetup.js';
import { HUD } from '../ui/HUD.js';
import { ShopUI } from '../ui/ShopUI.js';
import { Toolbar } from '../ui/Toolbar.js';
import { computeMoveVector, Input } from '../utils/Input.js';
import {
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
    setOnToolSelected() {}
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
    this.effectsPool = createParticlePool(48);
    this.audioSystem = new AudioSystem({ enabled: !headless });

    this.manualTool = null;
    this.currentHint = 'WASD move, SPACE act, click tile';
    this.pendingFieldRefresh = true;
    this.running = false;
    this.lastTimeMs = 0;
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

      this.raycaster = new this.THREE.Raycaster();
      this.ndc = new this.THREE.Vector2();
      this.cameraForward = new this.THREE.Vector3(0, 0, 1);

      this.input = new Input(window, document);
      this.hud = new HUD(document);
      this.toolbar = new Toolbar(document.getElementById('toolbar'));
      this.toolbar.setOnToolSelected((tool) => {
        this.manualTool = tool;
        this.toolbar.setActiveTool(tool);
      });

      this.shopUI = new ShopUI(document.getElementById('shop-modal'), {
        onBuySeeds: (count) => {
          const success = this.shopSystem.buySeed(count);
          if (!success) this.currentHint = 'Not enough coins for seeds';
          this.syncUi();
        },
        onBuyCan: () => {
          const success = this.shopSystem.buyWateringCanUpgrade();
          if (!success) this.currentHint = 'Not enough coins for watering upgrade';
          this.syncUi();
        },
        onBuyExpand: () => {
          if (this.gridSystem.rows >= GRID_MAX_ROWS) {
            this.currentHint = 'Farm already at max rows';
            this.syncUi();
            return;
          }
          const success = this.shopSystem.buyFarmExpansion();
          if (!success) {
            this.currentHint = 'Not enough coins for expansion';
          } else {
            this.gridSystem.expandRows(1);
            this.pendingFieldRefresh = true;
            this.currentHint = 'Farm expanded by +1 row';
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
    } else {
      this.input = createHeadlessInputStub();
      this.hud = createHeadlessHUDStub();
      this.toolbar = createHeadlessToolbarStub();
      this.shopUI = createHeadlessShopUIStub();
      this.cameraForward = { x: 0, y: 0, z: 1 };
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
      this.renderer.render(this.scene, this.camera);
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
    const timeState = this.timeSystem.update(deltaSeconds);
    this.updateLighting(timeState.phase);

    const movement = this.input.getMovementState();
    if (movement.up || movement.down || movement.left || movement.right) {
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

    if (this.input.consumeActionKey()) {
      const tile = this.gridSystem.worldToTile(this.player.position.x, this.player.position.z);
      if (tile) this.performPrimaryAction(tile.row, tile.col);
    }

    const click = this.input.consumePointer();
    if (click) {
      const tile = this.screenToTile(click.x, click.y);
      if (tile) this.performPrimaryAction(tile.row, tile.col);
    }

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

  performPrimaryAction(row, col) {
    const tile = this.gridSystem.getTile(row, col);
    if (!tile) return { success: false, tool: TOOL_TYPES.HAND };

    const tileKey = `${row},${col}`;
    const crop = this.cropSystem.getCrop(tileKey);
    const tool = this.manualTool ?? this.toolAdvisor.recommend(tile, crop);

    let success = false;

    if (tool === TOOL_TYPES.HOE) {
      success = this.gridSystem.tillTile(row, col);
      if (success) this.currentHint = 'Tile tilled';
    }

    if (tool === TOOL_TYPES.SEED) {
      if (!this.shopSystem.consumeSeed(1)) {
        this.shopSystem.buySeed(1);
        this.shopSystem.consumeSeed(1);
      }
      const planted = this.gridSystem.plantTile(row, col, 'strawberry');
      if (planted) {
        this.cropSystem.plant(tileKey, this.timeSystem.getDayNumber());
        success = true;
        this.currentHint = 'Seed planted';
      } else {
        this.currentHint = 'Cannot plant here';
      }
    }

    if (tool === TOOL_TYPES.WATER) {
      success = this.gridSystem.waterTile(row, col);
      if (success) {
        this.cropSystem.water(tileKey);
        this.currentHint = 'Watered';
      }
    }

    if (tool === TOOL_TYPES.SHOVEL) {
      this.cropSystem.remove(tileKey);
      success = this.gridSystem.clearTile(row, col);
      if (success) this.currentHint = 'Withered crop cleared';
    }

    if (tool === TOOL_TYPES.HAND) {
      const result = this.cropSystem.harvest(tileKey, this.rng);
      if (result) {
        this.shopSystem.addHarvest(result);
        this.gridSystem.clearTile(row, col);
        this.audioSystem.play('harvest');
        this.currentHint = `Harvested ${result.quality} strawberry`;
        success = true;
      }
    }

    this.toolbar.setActiveTool(tool);
    this.pendingFieldRefresh = true;
    this.syncUi();
    return { success, tool };
  }

  handleDayEnd() {
    const wateredTileKeys = this.gridSystem.getWateredTileKeys();
    this.cropSystem.advanceDay(this.timeSystem.getDayNumber(), wateredTileKeys);
    this.gridSystem.resetWaterFlags();
    this.currentHint = `Day ${this.timeSystem.getDayNumber()} started`;
    this.pendingFieldRefresh = true;
    this.saveSystem.save(this.getSnapshot());
  }

  updateLighting(phase) {
    if (!this.sun) return;
    if (phase === 'morning') {
      this.sun.color.setHex(0xfff1cc);
      this.sun.intensity = 1.0;
    }
    if (phase === 'noon') {
      this.sun.color.setHex(0xffffff);
      this.sun.intensity = 1.15;
    }
    if (phase === 'dusk') {
      this.sun.color.setHex(0xffa05f);
      this.sun.intensity = 0.75;
    }
    if (phase === 'night') {
      this.sun.color.setHex(0x4a6b9b);
      this.sun.intensity = 0.4;
    }
  }

  syncUi() {
    const economyState = this.shopSystem.getEconomyState();
    const strawberryCount = economyState.normalStrawberry + economyState.premiumStrawberry;

    this.hud.setState({
      dayNumber: this.timeSystem.getDayNumber(),
      phase: titleCase(this.timeSystem.getPhase()),
      coins: economyState.coins,
      strawberryCount,
      hint: this.currentHint
    });

    this.shopUI.setState(economyState);
  }

  getSnapshot() {
    const economyState = this.shopSystem.getEconomyState();
    return {
      version: SAVE_VERSION,
      dayNumber: this.timeSystem.getDayNumber(),
      timeOfDay: this.timeSystem.getElapsedRatio(),
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
      forceTool: (tool) => {
        this.manualTool = tool;
        this.toolbar.setActiveTool(tool);
      },
      performAction: (row, col) => this.performPrimaryAction(row, col),
      getState: () => this.getSnapshot(),
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
