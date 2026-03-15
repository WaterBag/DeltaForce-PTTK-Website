# DataQuery 页面文档

## 1. 页面职责

DataQuery 用于在指定护甲配置下，查询可用武器/子弹并进行多配置 TTK 对比。

- 页面文件：`frontend/src/pages/DataQuery.js`
- 接口封装：`frontend/src/api/ttkAPI.js`
- 图表处理：`frontend/src/utils/dataProcessor.js`

## 2. 输入与输出

输入：

- 头盔、护甲、耐久度、部位保护配置
- 武器选择
- 配件组合
- 图表开关（初速影响、扳机延迟影响）

输出：

- 可用武器列表
- 可添加的枪弹配置
- 对比线列表
- TTK 折线图数据

## 3. 关键状态

- 防具相关：`selectedHelmet`、`selectedArmor`、`helmetDurability`、`armorDurability`
- 查询相关：`availableGuns`、`currentGunDetails`、`loading`
- 对比相关：`comparisonLines`、`displayedChartData`
- 弹窗相关：`isModelOpen`、`showConfirmDialog`、`confirmDialogConfig`

## 4. 主流程

1. 用户先配置防具与耐久度。
2. 页面调用 `fetchAvailableGuns` 获取可用武器。
3. 用户点选武器后，页面并行请求该武器及变体武器的 `gun-details`。
4. 在改件弹窗中选择子弹和配件，生成一条对比线加入列表。
5. `processChartData` 基于当前线条与开关计算图表展示数据。

## 5. 护甲切换流程（重点）

1. 变更护甲/头盔后，进入“预查询或刷新”路径。
2. 若仅后端线条，先预查询判断哪些配置会失败。
3. 若存在风险，弹确认框；确认后保留成功项并移除失败项。
4. 最终刷新可用武器列表，保证 UI 与护甲状态一致。

## 6. 变体武器映射逻辑

- 对 `damageChange` 配件，查询名必须通过 `resolveBtkQueryName(mod, baseGunName)` 解析。
- `btkQueryName` 允许是字符串，也允许是对象映射。
- 统一解析可避免把对象错误传给后端 `gunName`。

## 7. 接口依赖

- `POST /api/ttk/available-guns`
- `POST /api/ttk/gun-details`

请求参数核心：

- 护甲等级与耐久
- 部位保护位（胸/腹/上臂）
- 查询武器名（含变体）

## 8. 异常与兜底

- 任一请求失败：弹 `Alert` 错误提示。
- 数据版本缺失时：自动回退到 `latest`。
- 数据点无效时：在护甲切换流程中剔除对应配置线。

## 9. 测试清单

- 护甲配置变化后可用武器是否刷新。
- 添加多条对比线后图表是否正确叠加。
- 使用 `damageChange` 配件时是否能稳定查询变体。
- 切护甲后失败项是否按预期提示并剔除。
- `latest/previous` 版本切换是否正确。
