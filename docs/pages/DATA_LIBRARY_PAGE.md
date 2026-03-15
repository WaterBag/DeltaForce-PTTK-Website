# DataLibrary 页面文档

## 1. 页面职责

DataLibrary 提供武器与弹药的数据图鉴浏览能力，支持检索、筛选、排序。

- 页面文件：`frontend/src/pages/DataLibrary.js`
- 列表组件：`WeaponList`、`AmmoList`
- 数据来源：`useGameData()`

## 2. 输入与输出

输入：

- Tab 切换（武器/弹药）
- 搜索关键字
- 口径筛选
- 排序字段

输出：

- 过滤后武器列表
- 过滤后弹药列表
- 结果总数统计

## 3. 关键状态

- `activeTab`
- 武器维度：`weaponSearchText`、`weaponCaliberFilter`、`weaponSortBy`
- 弹药维度：`ammoSearchText`、`ammoCaliberFilter`、`ammoSortBy`

## 4. 主流程

1. 加载 `weapons`、`ammos`、`modifications` 数据。
2. 计算可用口径列表 `availableCalibers`。
3. 构造 `weaponsWithDPS`，包含：
   - 过滤霰弹枪项
   - 变体武器回退到基础武器补全字段
   - 计算 `armorDPS`/`fleshDPS`
4. 根据筛选与排序得到 `filteredWeapons` 与 `filteredAmmos`。
5. 点击武器卡口径可跳转到弹药页并自动应用口径筛选。

## 5. 变体武器处理

页面内对 `isModification` 武器做“基础武器补全”：

- 通过 `modifications` 中的 `dataQueryName/appliesTo` 推断基础枪。
- 合并基础字段与变体字段，避免因字段缺失导致显示异常。

## 6. 异常与兜底

- 数值字段统一 `Number()` 处理，降低 `NaN` 风险。
- 排序前复制数组，避免原数据被原地修改。

## 7. 测试清单

- 武器 Tab：搜索、口径、排序三者叠加是否正确。
- 弹药 Tab：搜索、口径、排序是否正确。
- 点击武器口径是否跳转到弹药页并自动过滤。
- 变体武器展示是否存在空值或异常排序。
