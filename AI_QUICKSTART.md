# AI 快速上手指南（10 分钟）

本文件用于让新接入的 AI 或开发者在最短时间内理解项目目标、运行方式、核心模块与排错入口。

## 1. 项目一句话

DeltaForce-PTTK-Website 是一个《三角洲行动》武器数据分析站，核心提供：
- 概率 TTK 曲线查询与多配置对比
- 单发命中伤害模拟（含护甲耐久变化）
- 武器/弹药数据图鉴浏览

## 2. 技术栈与运行模型

- 前端：React 18（CRA，`react-scripts`）
- 后端：Express 5 + MySQL（`mysql2`）
- 数据源：前端本地静态数据 + 可选远程 JSON（通过 `useGameData` 自动回退）
- 部署模式：
  - 开发：前后端分离（前端 `3000`，后端 `3001`）
  - 生产：后端同时托管前端 `frontend/build`

## 3. 目录速览（高频）

- `frontend/src/App.js`：页面切换总入口（DataQuery / Simulator / DataLibrary）
- `frontend/src/hooks/useGameData.js`：统一游戏数据加载（远程优先、本地回退、缓存）
- `frontend/src/pages/DataQuery.js`：概率 TTK 查询与对比主流程
- `frontend/src/pages/Simulator.js`：单发命中模拟主流程
- `frontend/src/pages/DataLibrary.js`：图鉴筛选/排序流程
- `frontend/src/utils/dataProcessor.js`：TTK 图表数据处理核心
- `frontend/src/utils/simulationUtils.js`：伤害计算核心（`calculateSingleHit`）
- `backend/routes/ttk.js`：后端 API（`available-guns` / `gun-details` / `combinations` / `ttk-curve`）
- `backend/config/db.js`：数据库连接与环境变量读取

## 4. 本地启动（标准）

1. 安装依赖
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. 启动后端（终端 A）
```bash
cd backend
npm run dev
```

3. 启动前端（终端 B）
```bash
cd frontend
npm start
```

4. 访问
- 前端：`http://localhost:3000`
- 后端：`http://localhost:3001`

## 5. AI 推荐阅读顺序（必须）

1. `DOCS_INDEX.md`
2. `AI_TASK_PLAYBOOK.md`
3. `SYSTEM_MAP.md`
4. `API_CONTRACTS.md`
5. `DATA_DICTIONARY.md`
6. `WEBSITE_LOGIC_ARCHIVE.md`
7. `docs/pages/README.md`
8. 再看具体源码（按任务点定位）

## 6. 三个核心业务链路

### 6.1 数据查询链路（DataQuery）
- 用户选择护甲/头盔与耐久，前端调用 `fetchAvailableGuns`
- 选枪后调用 `fetchGunDetails` 拉取可用子弹与距离点
- 添加对比线后由 `processChartData` 计算图表展示数据
- 切护甲时先预检查，必要时弹确认框，避免“静默失效”

### 6.2 模拟器链路（Simulator）
- 用户选择武器、子弹、配件、护甲
- 通过 `configuredWeapon` 合并“变体模板 + 百分比配件修正”
- 点击人体部位触发 `calculateSingleHit`
- 返回血量伤害、护甲耐久变化、命中日志

### 6.3 图鉴链路（DataLibrary）
- 统一读取 `useGameData` 数据源
- 武器列表计算 `armorDPS/fleshDPS` 后筛选排序
- 变体武器支持回退到基础武器字段补齐

## 7. 首次排错优先级（AI 执行建议）

1. 先确认数据源：`useGameData` 的 `source` 与 `error`
2. 再看 API 入参与字段名是否匹配（`API_CONTRACTS.md`）
3. 再看武器/配件映射是否命中（`dataQueryName` / `btkQueryName`）
4. 最后检查图表处理和模拟器计算函数

## 8. 常见误区

- `backend` 目录外执行 `npm run dev` 会报 `ENOENT package.json`。
- 清理 `node_modules/build` 后需重新安装依赖再启动。
- 变体配件可能把查询武器名切到另一把枪，必须走映射解析。
- `gun-details` 支持 latest/previous 版本数据，前端要按 `dataVersion` 正确取值。
- 当前后端监听端口在代码中写死为 `3001`（`backend/index.js`），不是读取 `PORT` 环境变量。

## 9. AI 接手任务模板（建议）

当 AI 开始改动前，先输出：
- 目标页面/模块
- 受影响链路（数据源/API/计算/展示）
- 预期风险（数据不一致、映射错配、版本切换）
- 最小验证清单（功能点 + 1 条异常场景）
