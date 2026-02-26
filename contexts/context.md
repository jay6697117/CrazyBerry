# 项目核心上下文: CrazyBerry

## 1. 项目简介
CrazyBerry 是一个纯前端、基于 ES Modules 直接在浏览器运行的 Low-poly 3D 农场游戏。
玩家可以移动角色、互动（使用农具松土、播种、浇水、收割），并在商店买卖物品。

## 2. 目标
用户希望使用 `.agent/skills` 下的 Three.js 相关技能，对当前的 Three.js 渲染效果进行彻底重构和优化。
优化目标是达到参考图（`1.jpg`, `2.jpg`）的复杂度和画面效果。参考图展现了：
- 高质量的卡通渲染风格（Stylized/Low-poly）
- 细致的光影和阴影效果（温暖的阳光、环境光遮蔽、可能的泛光 Bloom）
- 丰富的作物模型状态（而非目前的简单几何体拼接）
- 网格化的土地系统（起伏的耕地、草地纹理）

## 3. 技术栈
- 核心逻辑: Vanilla JavaScript (ESM)
- 渲染引擎: Three.js (r160)
- 运行方式: 原生 ES Modules 引入 (`import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'`)
- 工具链: npm scripts (`http-server`, `node --test`, `playwright`)

## 4. 当前架构分析
- **入口**: `src/main.js` 和 `index.html` (包含 UI 图层)
- **游戏逻辑**: `src/game/GameManager.js`, `GridSystem.js`, `CropSystem.js`, `TimeSystem.js` 等。
- **渲染层**: `src/rendering/`
  - `SceneSetup.js`: 基础场景、相机、灯光和 WebGLRenderer 的初始化。
  - `Models.js`: 负责创建网格几何体和材质，目前主要使用基础几何体 (`BoxGeometry`, `CircleGeometry`) 和 InstancedMesh。
  - `FieldRenderer.js`: 负责将地块和草莓等作物通过 InstancedMesh 批量渲染到场景中。
- **当前瓶颈**:
  - 渲染非常基础，缺少高级材质、后处理和精美的光影。
  - 模型全靠基础形状拼接，表现力不足。

## 5. 重构方向
我们将利用 `.agent/skills` 提供的 Three.js 最佳实践，分步骤替换和升级以下模块：
1. **光影系统 (Lighting)**: 升级 DirectionalLight 阴影配置、引入 HemisphereLight 或环境贴图 (HDRI)。
2. **材质与几何体 (Materials & Geometry)**: 将基础材质升级为调整过的 `MeshStandardMaterial`，可能加入自定义 Shader，或优化 UV 映射。
3. **后处理 (Postprocessing)**: 引入 `EffectComposer`，添加 RenderPass, UnrealBloomPass，可能的话添加 SSAO (屏幕空间环境光遮蔽) 以增强深度感。
4. **模型优化 (Geometry)**: 改造 `Models.js` 和 `Strawberry.js`，通过代码构建更好看的表现（例如使用 BufferGeometry 构建起伏的土包）。
