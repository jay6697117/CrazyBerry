# CrazyBerry 重构任务清单

- [x] **1. 光影系统与环境搭建**
  - [x] 修改 `SceneSetup.js`，引入 `HemisphereLight` 替代简单的 `AmbientLight`。
  - [x] 调整 `DirectionalLight` 的颜色、强度、位置，以及阴影贴图的分辨率和相机范围。
  - [x] 在 `WebGLRenderer` 中开启物理上的正确光照和更柔和的阴影 (PCFSoftShadowMap)。

- [x] **2. 材质与几何体升级**
  - [x] 在 `Models.js` 中将基础材质统一更换为更有质感的 `MeshStandardMaterial`，并调节 roughness 和 metalness。
  - [x] 实现自定义草地块 (Tile)：放弃原先平整的 `BoxGeometry`，编写一个稍微带有随机顶点偏移的低多边形块面。
  - [x] 为不同状态的农田 (Grass/Tilled) 添加更丰富的颜色渐变和边框细节。
  - [x] 优化实例化网格（`InstancedMesh`）的颜色插值和法线渲染效果。

- [x] **3. 作物模型替换**
  - [x] 在 `Strawberry.js` / `Models.js` 中重写草莓生长各阶段的几何体。
  - [x] *种子* -> *小芽* -> *生长* -> *开花* -> *结果*：从抽象几何体改为代码生成的更有机的低多边形网格（如叠加多个变换过的叶片、真实的果实形状）。
  - [x] 调整生长的锚点、大小比例，并在 `FieldRenderer` 中更新位置计算。

- [x] **4. 视效增强与后处理**
  - [x] 评估并引入 `EffectComposer` (如果原生 ES Module `three/addons/...` 可用)。
  - [x] 添加 `RenderPass` 和轻量级的 `UnrealBloomPass` 以实现游戏界面的梦幻柔光效果。
  - [x] 如有性能余量且效果良好，尝试增加简单的环境遮蔽或色彩校正。

- [/] **5. 测试与效果验证**
  - [x] 运行调试脚本 `window.__crazyberry.debugRunFullLoop()`。
  - [x] 在浏览器下观察不同阶段的地形、作物和光影表现。
  - [/] 与参考图 `1.jpg`、`2.jpg` 进行视觉比对。
