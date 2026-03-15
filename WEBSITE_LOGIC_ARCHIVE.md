# DeltaForce-PTTK Website 逻辑归档

## 1. 项目目标

本项目用于《三角洲行动》武器与防具场景下的伤害/TTK 分析，核心能力包括：

- 数据查询对比（DataQuery）
- 命中模拟器（Simulator）
- 数据图鉴浏览（DataLibrary）

## 2. 总体架构

- 前端：React 18（`frontend`）
- 后端：Express 5 + MySQL2（`backend`）
- 数据层：
  - 前端静态数据（`frontend/src/assets/data`）
  - 可选远程 JSON 数据（`/data/*.json`）
  - 后端数据库表 `btk_list_results`（用于 TTK/BTK 查询）

## 3. 前端页面逻辑

入口组件：`frontend/src/App.js`

页面切换不是 URL 路由，而是 `currentView` 状态切换：

- `dataQuery` -> `DataQuery`
- `simulator` -> `Simulator`
- `dataLibrary` -> `DataLibrary`

### 3.1 DataQuery（对比查询）

核心文件：`frontend/src/pages/DataQuery.js`

主流程：

1. 用户选择头盔/护甲与耐久
2. 前端请求后端可用武器列表
3. 选择武器后拉取该武器可用子弹与曲线数据
4. 添加多条对比线并在图表中展示
5. 切换护甲时自动预查询并处理无效配置

关键点：

- 配件含 `damageChange` 时会映射到“变体武器名”查询后端
- 支持 `latest/previous` 两个版本的数据线
- 图表支持初速影响、扳机延迟影响开关

### 3.2 Simulator（命中模拟）

核心文件：

- `frontend/src/pages/Simulator.js`
- `frontend/src/utils/simulationUtils.js`

主流程：

1. 选择武器、弹药、配件、护甲与距离
2. 点击人体部位触发单次命中计算
3. 更新目标血量、护甲耐久和日志
4. 血量归零时输出 BTK/TTK 统计

关键点：

- 使用本地计算引擎，不依赖后端接口
- 对 `damageChange`、`specialRange` 配件做武器模板替换
- 具备部位倍率、穿透率、护甲耐久衰减、特殊弹药逻辑（如 PD12）

### 3.3 DataLibrary（数据图鉴）

核心文件：`frontend/src/pages/DataLibrary.js`

主流程：

1. 浏览武器/弹药 Tab
2. 按名称、口径、属性筛选排序
3. 展示武器基础值与衍生 DPS

## 4. 前端数据加载策略

核心文件：`frontend/src/hooks/useGameData.js`

策略：

- 默认先用本地静态数据兜底
- 异步加载远程 JSON 覆盖本地
- 对远程数据缺失图片字段时自动回填本地图片

当前行为（已修复）：

- 远程拉取加入重试机制（最多 3 次）
- 失败时释放 `loadingPromise`，后续组件挂载可再次尝试远程加载

## 5. 后端 API 逻辑

入口：`backend/index.js`  
路由：`backend/routes/ttk.js`

主要接口：

- `POST /api/ttk/available-guns`
  - 输入：防具等级、耐久、覆盖位
  - 输出：可用枪名列表
- `POST /api/ttk/gun-details`
  - 输入：枪名 + 防具配置
  - 输出：可用子弹与数据点（含 latest/previous 聚合）
- `POST /api/ttk/combinations`
  - 输出：枪弹组合列表
- `POST /api/ttk/ttk-curve`
  - 输出：某枪弹在当前防具配置下的距离曲线

## 6. 已修复问题归档

本次已修复：

1. 生产环境 API 路径重复拼接
2. `DataQuery` 中变体枪名解析分支不一致
3. 多处 React Hook 依赖缺失导致潜在陈旧状态
4. 远程数据加载失败后无法重试

## 7. 运行与验证

- 后端：`cd backend && npm run dev`
- 前端：`cd frontend && npm start`
- 代码检查：前后端 `npm run lint`
- 打包验证：`cd frontend && npm run build`

