# 系统地图（System Map）

本文件描述项目的系统边界、模块关系、关键数据流与故障定位入口，供 AI 快速建立“全站心智模型”。

## 1. 系统边界

- 前端应用：`frontend/src/*`
- 后端 API：`backend/*`
- 数据持久层：MySQL 表 `btk_list_results`
- 静态业务数据：`frontend/src/assets/data/*`
- 可选远程数据源：`REACT_APP_DATA_BASE_URL` 指向的 JSON（`manifest + 5 张主数据表`）

## 2. 顶层架构

```text
用户交互
  -> App(Layout/Sidebar)
    -> DataQuery | Simulator | DataLibrary
      -> useGameData (远程优先 + 本地回退)
      -> API(ttkAPI.js) -> backend/routes/ttk.js -> MySQL
      -> utils(dataProcessor/simulationUtils/modSelectionUtils)
```

## 3. 前端模块图

### 3.1 应用壳层
- `frontend/src/App.js`
  - 状态：`currentView`
  - 负责三页切换，不做业务计算
- `frontend/src/components/layout/Layout.jsx`
  - 提供 Header + Sidebar + Main 区域
- `frontend/src/components/layout/Sidebar.jsx`
  - 导航入口 + 固定命中概率展示

### 3.2 数据层
- `frontend/src/hooks/useGameData.js`
  - 远程数据加载：`manifest.json + weapons/ammos/armors/helmets/modifications.json`
  - 重试策略：最多 3 次，指数等待（500ms、1000ms、1500ms）
  - 失败回退：本地静态数据
  - 进程内缓存：`cachedGameData` + `loadingPromise`

### 3.3 页面层
- `frontend/src/pages/DataQuery.js`
  - 护甲配置 -> 可用枪查询 -> 枪详情查询 -> 对比线 -> 图表
  - 护甲切换存在“预检查 + 确认 + 刷新/移除失效线”流程
- `frontend/src/pages/Simulator.js`
  - 组合武器+配件+子弹得到 `configuredWeapon`
  - 点击人体部位，调用 `calculateSingleHit`
- `frontend/src/pages/DataLibrary.js`
  - 图鉴筛选/排序
  - 变体武器字段回退补齐

### 3.4 计算工具层
- `frontend/src/utils/dataProcessor.js`
  - 处理 TTK 曲线
  - 处理配件对射速/射程/初速/扳机延迟的影响
  - 处理变体武器映射
- `frontend/src/utils/simulationUtils.js`
  - 核心命中计算（护甲覆盖、穿透、钝伤/混合伤害）
  - `PD12双头弹` 特殊分支
- `frontend/src/utils/modSelectionUtils.js`
  - 配件互斥、槽位解锁、依赖移除

## 4. 后端模块图

- `backend/index.js`
  - 中间件装配：`cors`、`express.json`、请求日志
  - 路由挂载：`/api/ttk`
  - 生产静态托管：`../frontend/build`
  - 错误处理中间件：`notFoundHandler` + `globalErrorHandler`
- `backend/routes/ttk.js`
  - 业务 API 实现
  - 核心表：`btk_list_results`
  - `gun-details` 包含 latest/previous 版本聚合逻辑
- `backend/config/db.js`
  - 读取 `.env`，建立 mysql2 pool（promise）
- `backend/middleware/errorHandler.js`
  - 异步路由包装 `asyncHandler`
  - 统一错误 JSON 输出

## 5. 关键数据流（分场景）

### 5.1 DataQuery（概率图）
1. 选择护甲参数
2. 前端 `fetchAvailableGuns` -> `POST /api/ttk/available-guns`
3. 选枪后 `fetchGunDetails` -> `POST /api/ttk/gun-details`
4. 用户选配件/子弹加入对比线
5. `processChartData` 生成可绘制曲线

### 5.2 护甲切换（带风险控制）
1. 缓存旧护甲配置
2. 预检查当前对比线在新护甲下是否仍可查询
3. 若存在失效线，弹确认框
4. 确认后保留有效线，移除失效线并刷新可用枪
5. 取消则回滚护甲状态

### 5.3 Simulator（单发模拟）
1. 组装 `configuredWeapon`
2. 传入 `calculateSingleHit(gun, ammo, armor, helmet, durability, hitSite, distance)`
3. 返回 `healthDamage/newHelmetDurability/newArmorDurability/logMessage`
4. UI 更新血量、护甲、命中日志，击杀时计算 BTK/TTK

## 6. 环境变量与配置

### 前端
- `REACT_APP_DATA_BASE_URL`：远程数据根路径（默认 `/data`）
- `NODE_ENV`：决定 API 基址与构建模式

### 后端
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`
- 注意：当前代码中端口是硬编码 `3001`（`backend/index.js`），并未读取 `PORT` 环境变量

## 7. 故障定位速查

- API 全挂：先看 `backend/index.js` 是否启动、端口是否占用、`.env` 是否正确
- 图表空白：检查 `comparisonLines` 是否有数据、`processChartData` 是否过滤掉目标子弹
- 模拟伤害异常：检查 `simulationUtils.js` 中命中部位倍率与弹药穿透字段
- 远程数据失效：看 `useGameData` 的 `source/error` 是否回退到本地

## 8. 设计约束（必须遵守）

- 变体配件查询名必须经过映射解析（对象或字符串两种类型都要支持）
- latest/previous 数据版本切换不能破坏旧字段兼容（`allDataPoints` 保留）
- 护甲覆盖逻辑必须以“部位保护布尔值 + 当前耐久 > 0”为前提
