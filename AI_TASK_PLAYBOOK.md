# AI 任务执行手册（Playbook）

本手册定义 AI 在本仓库执行开发任务时的标准流程，目标是降低误改风险、提升交付一致性。

## 1. 适用范围

- 适用于功能新增、Bug 修复、文档维护、重构与回归验证。
- 不替代业务文档；与 `SYSTEM_MAP.md`、`API_CONTRACTS.md`、`DATA_DICTIONARY.md` 配合使用。

## 2. 执行总流程（必须按顺序）

1. 明确任务边界  
2. 建立最小上下文  
3. 识别风险点  
4. 实施改动  
5. 本地验证  
6. 输出变更摘要与残留风险

## 3. 改动前检查清单

### 3.1 上下文收集（最小集）
- 页面入口：`frontend/src/App.js`
- 涉及页面：`DataQuery.js` / `Simulator.js` / `DataLibrary.js`
- 数据来源：`useGameData.js`
- API 契约：`backend/routes/ttk.js` + `frontend/src/api/ttkAPI.js`
- 计算核心：`dataProcessor.js` 或 `simulationUtils.js`

### 3.2 兼容性核对
- 是否改动 API 字段名（高风险）
- 是否改动数据字典字段类型（高风险）
- 是否影响 latest/previous 版本逻辑
- 是否涉及变体映射（`dataQueryName`/`btkQueryName`）

### 3.3 风险标记（任务开始前输出）
- 受影响链路：数据源 / API / 计算 / 展示
- 可能回归点：页面功能、边界输入、异常分支
- 预计验证项：至少 3 条（主流程 + 异常 + 回退）

## 4. 各模块改动规则

### 4.1 DataQuery 规则
- 护甲切换必须保留“预检查 -> 确认 -> 刷新/移除失效线”流程。
- `dataVersion` 必须仅取 `latest | previous`。
- 变体枪查询名必须先解析后再发 `gun-details` 请求。

### 4.2 Simulator 规则
- 伤害计算统一走 `calculateSingleHit`。
- 配件逻辑统一走 `modSelectionUtils`，不要手写互斥判断。
- `configuredWeapon` 修改后必须校验：
  - 射速/初速百分比修正是否叠加正确
  - 射程 `999` 是否被错误放大

### 4.3 DataLibrary 规则
- 排序前必须复制数组，避免原地修改源数据。
- 变体条目显示要支持基础武器字段回退补齐。

### 4.4 后端 API 规则
- `allDataPoints`、`hasPrevious`、`previousAllDataPoints` 为关键兼容字段，不可随意删除。
- 错误输出保持统一 JSON 结构（`success/message/error`）。

## 5. 回归验证模板（最少执行）

### 5.1 DataQuery
- 能按护甲配置拉到可用枪列表。
- 添加 2 条以上对比线后图表正常渲染。
- 切换护甲触发预检查；失效线能提示并按确认结果处理。
- latest/previous 切换后曲线能正确变化。

### 5.2 Simulator
- 默认护甲初始化正常（5 级耐久最高）。
- 命中不同部位时伤害与耐久变化合理。
- `PD12双头弹` 分支行为正常。
- 击杀时 BTK/TTK 日志仅记录一次击杀结论。

### 5.3 DataLibrary
- 武器/弹药检索、口径过滤、排序组合生效。
- 点击武器口径能跳转弹药页并带入过滤。
- 变体武器无空字段显示异常。

## 6. 文档同步规则

若改动涉及以下内容，必须同步更新对应文档：
- 接口字段/响应结构：`API_CONTRACTS.md`
- 数据结构字段：`DATA_DICTIONARY.md`
- 页面行为流程：`docs/pages/*`
- 系统边界或调用链：`SYSTEM_MAP.md`

## 7. 交付输出模板（建议）

提交结果应至少包含：
- 改动目标与范围
- 修改点摘要（按链路，不按文件罗列）
- 验证结果（通过/未验证项）
- 残留风险与后续建议

## 8. 当前仓库特别提醒

- 后端端口当前写死 `3001`（`backend/index.js`）。
- 清理依赖后（`node_modules` 删除）需重新 `npm install`。
- 在错误目录运行 npm 命令会触发 `ENOENT package.json`。
