# Simulator 页面文档

## 1. 页面职责

Simulator 提供单发命中级别的交互模拟，展示血量与护甲耐久的动态变化。

- 页面文件：`frontend/src/pages/Simulator.js`
- 核心计算：`frontend/src/utils/simulationUtils.js`
- 配件槽位规则：`frontend/src/utils/modSelectionUtils.js`

## 2. 输入与输出

输入：

- 武器、弹药、配件
- 头盔/护甲与耐久
- 目标初始血量
- 距离
- 命中部位（点击人体模型）

输出：

- 单次命中伤害结果
- 当前血量、头盔耐久、护甲耐久
- 命中日志（含击杀统计）

## 3. 关键状态

- 武器链路：`selectedWeapon`、`selectedAmmo`、`selectedMods`
- 防具链路：`selectedHelmet`、`selectedArmor`、`helmetDurability`、`armorDurability`
- 战斗链路：`targetHp`、`currentHelmetDurability`、`currentArmorDurability`、`hitLog`
- 其他：`distance`、`initialHp`

## 4. 主流程

1. 页面加载后默认选择 5 级且耐久最高的头盔/护甲。
2. 用户选择武器后，弹药列表按口径过滤并优先默认 5 穿透弹。
3. 用户选择配件，系统按槽位互斥/解锁规则维护 `selectedMods`。
4. 计算 `configuredWeapon`（变体模板 + 百分比修正叠加）。
5. 点击人体部位触发 `calculateSingleHit(...)`，更新血量与耐久。

## 5. 伤害计算结构

`calculateSingleHit` 关键逻辑：

1. 计算部位倍率与基础伤害。
2. 结合距离段应用衰减系数。
3. 判断该部位是否被护甲覆盖。
4. 计算穿透率、护甲伤害、钝伤/混合伤害。
5. 返回新血量伤害与耐久变化。

特殊逻辑：

- `PD12` 走专门分支 `calculatePD12Damage`。
- 击杀后自动生成 BTK/TTK 日志。

## 6. 异常与提示

- 未选齐武器/弹药/防具即点击命中：弹 warning。
- 目标已被击倒时继续点击：提示先重置。
- 配件不可选（未解锁槽位）会展示 disabled 状态。

## 7. 测试清单

- 默认防具初始化是否正确。
- 不同部位命中伤害与耐久消耗是否符合预期。
- 配件切换后武器最终属性表是否即时更新。
- 改距离后同部位伤害是否变化。
- 击杀后 BTK/TTK 日志是否只记录一次击杀结论。
