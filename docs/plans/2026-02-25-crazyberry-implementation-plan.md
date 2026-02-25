# CrazyBerry Full v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建可在浏览器直接运行的 CrazyBerry v1（Phase 1-5），完整覆盖“翻地→播种→浇水→生长→收获→出售→升级→扩展”循环。

**Architecture:** 采用 strict ESM（无 bundler），将“纯逻辑系统（可单元测试）”与“Three.js 渲染层（可 E2E 验证）”分层；`GameManager` 统一编排系统生命周期；通过 debug API 提供可自动化验证入口。

**Tech Stack:** Three.js r160 ESM CDN、WebGL2、Node.js `node --test`、Playwright、localStorage、HTML5 Audio API。

---

## 强制技能与执行约束

- 必须使用：`@writing-plans`、`@threejs-builder`、`@test-driven-development`、`@verification-before-completion`。
- `@threejs-builder` 强制规则：
  - 使用 `renderer.setAnimationLoop`（禁止手写 `requestAnimationFrame` 主循环）。
  - 渲染像素比固定 `Math.min(window.devicePixelRatio, 2)`。
  - 固定相机（isometric-like），不使用 OrbitControls。
  - WASD 使用相机相对移动向量。
  - 更新循环禁止创建几何体/材质/临时对象。
  - 网格与作物优先 `InstancedMesh`。

---

## 公开接口与类型变更

- `src/game/GameManager.js`
  - `init()`
  - `start()`
  - `stop()`
  - `update(deltaSeconds)`
  - `performPrimaryAction(row, col)`
  - `getSnapshot()`
  - `restoreSnapshot(snapshot)`
  - `createDebugApi()`
- `src/game/TimeSystem.js`
  - `update(deltaSeconds) -> { dayAdvanced, phase }`
  - `onDayEnd(listener)`
- `src/game/GridSystem.js`
  - `getTile(row, col)`
  - `tillTile(row, col)`
  - `plantTile(row, col, cropId)`
  - `waterTile(row, col)`
  - `clearTile(row, col)`
  - `expandRows(extraRows)`
  - `resetWaterFlags()`
  - `snapshot()` / `restore(snapshot)`
- `src/game/CropSystem.js`
  - `plant(tileKey, dayNumber)`
  - `advanceDay(dayNumber, wateredTileKeys)`
  - `harvest(tileKey, rng)`
  - `getCrop(tileKey)`
  - `snapshot()` / `restore(snapshot)`
- `src/game/ShopSystem.js`
  - `buySeed(count)`
  - `sellStrawberry({ normalCount, premiumCount })`
  - `buyWateringCanUpgrade()`
  - `buyFarmExpansion()`
  - `addHarvest(result)`
  - `getEconomyState()`
- `src/game/SaveSystem.js`
  - `save(snapshot)`
  - `load()`
  - `clear()`
  - 存档键固定：`crazyberry.save.v1`

---

## 任务拆分

### Task 1: 项目骨架与测试基线

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/game/GameManager.js`
- Test: `tests/unit/bootstrap.test.js`

**Steps:**
1. 写失败测试（bootstrap 暴露生命周期方法）。
2. 运行失败测试验证红灯。
3. 写最小实现。
4. 运行测试验证绿灯。
5. 提交。

### Task 2: 常量、规则与状态 schema

**Files:**
- Create: `src/utils/Constants.js`
- Test: `tests/unit/constants.test.js`

**Steps:**
1. 写失败测试（网格、天长、阶段阈值）。
2. 运行失败测试。
3. 写最小常量实现。
4. 运行通过测试。
5. 提交。

### Task 3: TimeSystem（日夜与跨天）

**Files:**
- Create: `src/game/TimeSystem.js`
- Test: `tests/unit/time-system.test.js`

**Steps:**
1. 写失败测试（跨天触发与 phase）。
2. 运行失败测试。
3. 写最小实现。
4. 运行通过测试。
5. 提交。

### Task 4: GridSystem + CropSystem（5阶段/枯萎/收获）

**Files:**
- Create: `src/entities/GridTile.js`
- Create: `src/game/GridSystem.js`
- Create: `src/game/CropSystem.js`
- Test: `tests/unit/grid-crop.test.js`

**Steps:**
1. 写失败测试（翻地、播种、浇水、生长、枯萎、收获）。
2. 运行失败测试。
3. 写最小实现。
4. 运行通过测试。
5. 提交。

### Task 5: ShopSystem + SaveSystem（经济与持久化）

**Files:**
- Create: `src/game/ShopSystem.js`
- Create: `src/game/SaveSystem.js`
- Test: `tests/unit/shop-save.test.js`

**Steps:**
1. 写失败测试（买种子、卖草莓、存档恢复）。
2. 运行失败测试。
3. 写最小实现。
4. 运行通过测试。
5. 提交。

### Task 6: Three.js SceneSetup（按 @threejs-builder 规范）

**Files:**
- Create: `src/rendering/SceneSetup.js`
- Modify: `src/main.js`
- Test: `tests/unit/scene-setup.test.js`

**Steps:**
1. 写失败测试（pixel ratio cap）。
2. 运行失败测试。
3. 写最小实现（固定相机、环境光+主光、像素比上限）。
4. 运行通过测试。
5. 提交。

### Task 7: 模型工厂 + InstancedMesh 农田渲染

**Files:**
- Create: `src/rendering/Models.js`
- Create: `src/rendering/FieldRenderer.js`
- Test: `tests/unit/field-renderer.test.js`

**Steps:**
1. 写失败测试（tileIndex）。
2. 运行失败测试。
3. 写最小实现（共享 geometry/material + 实例化渲染）。
4. 运行通过测试。
5. 提交。

### Task 8: Input + Player（相机相对移动）

**Files:**
- Create: `src/utils/Input.js`
- Create: `src/entities/Player.js`
- Test: `tests/unit/input-movement.test.js`
- Test: `tests/e2e/player-movement.spec.js`

**Steps:**
1. 写失败测试（camera-relative movement）。
2. 运行失败测试。
3. 写最小实现。
4. 运行通过测试。
5. 提交。

### Task 9: UI 层（HUD/Toolbar/ShopUI）+ ToolAdvisor

**Files:**
- Create: `src/ui/HUD.js`
- Create: `src/ui/Toolbar.js`
- Create: `src/ui/ShopUI.js`
- Create: `src/game/ToolAdvisor.js`
- Modify: `index.html`
- Modify: `src/game/GameManager.js`
- Test: `tests/unit/tool-advisor.test.js`
- Test: `tests/e2e/ui-flow.spec.js`

**Steps:**
1. 写失败测试（工具推荐、HUD/Toolbar 更新）。
2. 运行失败测试。
3. 写最小实现。
4. 运行通过测试。
5. 提交。

### Task 10: Effects + Audio + 集成验收

**Files:**
- Create: `src/rendering/Effects.js`
- Create: `src/audio/AudioSystem.js`
- Modify: `src/game/GameManager.js`
- Modify: `src/main.js`
- Test: `tests/unit/effects-pool.test.js`
- Test: `tests/e2e/full-loop.spec.js`
- Create: `README.md`
- Create: `docs/testing/manual-checklist.md`

**Steps:**
1. 写失败测试（对象池复用）。
2. 运行失败测试。
3. 写最小实现（粒子池、音效钩子、全链路 debug 流程）。
4. 运行 `npm run test:all`。
5. 提交。

---

## 必跑测试清单

1. `node --test tests/unit/bootstrap.test.js`
2. `node --test tests/unit/constants.test.js`
3. `node --test tests/unit/time-system.test.js`
4. `node --test tests/unit/grid-crop.test.js`
5. `node --test tests/unit/shop-save.test.js`
6. `node --test tests/unit/scene-setup.test.js`
7. `node --test tests/unit/field-renderer.test.js`
8. `node --test tests/unit/input-movement.test.js`
9. `node --test tests/unit/tool-advisor.test.js`
10. `node --test tests/unit/effects-pool.test.js`
11. `npx playwright test tests/e2e/player-movement.spec.js`
12. `npx playwright test tests/e2e/ui-flow.spec.js`
13. `npx playwright test tests/e2e/full-loop.spec.js`
14. `npm run test:all`

---

## 验收标准

1. 3D 场景、农田、角色可见，角色可移动。
2. 自动工具切换准确，UI 高亮与动作一致。
3. 草莓 5 阶段生长可观察，缺水可枯萎，成熟可收获。
4. 收获可出售，金币变化正确，可购买升级与扩地。
5. 自动存档与页面刷新恢复正常。
6. 主循环使用 `setAnimationLoop` 且运行稳定。
7. 单测与 E2E 全部通过。

---

## 假设与默认值

1. 当前仓库初始无实现代码。
2. Node.js >= 20，浏览器支持 WebGL2。
3. localStorage 可用，存档版本固定 `1`。
4. 角色移动速度默认 `4 units/s`。
5. 优质草莓概率固定 `0.2`，可注入 RNG 保证测试稳定。
