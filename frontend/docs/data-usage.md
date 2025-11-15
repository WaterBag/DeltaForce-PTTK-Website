# 数据使用原理与维护指南（前端）

说明：本文件总结了前端如何使用 `weapons.js`、`ammos.js`、`modifications.js` 等数据文件，便于开发者维护与扩展。

## 目录
- 概览
- 主要数据文件说明
  - `weapons.js`
  - `ammos.js`
  - `modifications.js`
- 前端计算流程（核心逻辑）
- 变体（variant）与配件（mod）交互规则
- 新增/修改数据的步骤与注意事项
- 常见错误与排查建议
- 示例：为武器添加一个枪管变体

---

## 概览
前端采用数据驱动模型：所有武器、弹药、配件以静态 JS 数据文件存储，`dataProcessor.js` 将这些数据与后端 BTK/曲线数据结合后，计算出最终用于展示的 TTK/PTTK 曲线与伤害结果。

目标原则：
- 数据分离（武器/弹药/配件）
- 变体只描述差异（Minimal Variant）
- 所有百分比修正由配件累加计算（不在变体中重复计算）

## 主要数据文件说明

### weapons.js
- 列表形式的武器对象数组。每个武器常见字段：
  - `id`, `name`, `image`, `caliber`
  - 伤害：`damage`, `armorDamage`
  - 射速/初速：`fireRate` (RPM), `muzzleVelocity` (m/s)
  - 命中倍率：`headMultiplier`, `chestMultiplier`, `abdomenMultiplier`, `upperArmMultiplier`, `lowerArmMultiplier`, `thighMultiplier`, `calfMultiplier`
  - 射程阶位：`range1..range5` 与对应 `decay1..decay5`（衰减倍率）
  - 可选：`triggerDelay`, `isModification`（标识为变体）

约定：变体条目应只包含与基础武器不同的字段（如 change 的 damage 或 headMultiplier），其它属性保持与基础武器一致。

### ammos.js
- 弹药数据数组，字段示例：
  - `id`, `caliber`, `name`, `rarity`
  - 穿透：`penetration`、`secondaryPenetration`、`sameLevelPenetration`
  - 肉体/护甲伤害系数：`fleshDamageCoeff`, `armor1..armor6`
  - `image`

这些参数在伤害计算与穿透逻辑中使用（后端 BTK 或前端模拟）。

### modifications.js
- 配件数据数组，每个配件含：
  - `id`, `name`, `type`, `appliesTo`（适用武器名数组）
  - `effects`：常见键：`rangeModifier`, `fireRateModifier`, `muzzleVelocityModifier`, `damageChange`, `specialRange`, `dataQueryName`, `btkQueryName`, `changeTriggerDelay`, `triggerDelay` 等。

语义说明：
- `rangeModifier`、`fireRateModifier`、`muzzleVelocityModifier` 为百分比修正（例如 0.18 表示 +18%）。这些值会被累加后应用。
- `damageChange: true` 表示该配件会切换到一个变体武器（变体名由 `dataQueryName` 指定），前端将使用该变体的伤害相关属性。
- `specialRange: true` 表示射程（及衰减）也应当从变体读取。
- `btkQueryName` 用于后端 BTK 查询键（若前后端协作需要）。

## 前端计算流程（核心逻辑）
位置：`frontend/src/utils/dataProcessor.js`。

主要步骤：
1. 根据 `lineConfig.gunName` 查找基础 `weapon`。
2. 解析 `mods`（配件 id 列表），找到是否存在 `damageChange` 或 `specialRange` 的配件。
3. 如果存在 `damageChange`：
   - 使用 `dataQueryName` 在 `weapons` 中查找变体（作为 `baseWeaponProfile`），变体用于覆盖伤害相关字段（damage、multipliers 等）。
4. 如果存在 `specialRange`：
   - 使用 `dataQueryName` 找到变体并用作 `rangeWeaponProfile`，覆盖射程相关字段（rangeX、decayX）。
5. 遍历所有配件，累加 `fireRateModifier`、`rangeModifier`、`muzzleVelocityModifier` 等为 `total*`。
6. 形成 `finalWeaponStats`：
   - 伤害相关字段使用 `baseWeaponProfile`（如有），射程使用 `rangeWeaponProfile`（如有），其他字段使用原始 `weaponInfo`。
7. 计算最终数值：
   - `fireRate = finalWeaponStats.fireRate * (1 + totalFireRateModifier)`
   - `muzzleVelocity = finalWeaponStats.muzzleVelocity * (1 + totalMuzzleVelocityModifier)`
   - `rangeX = finalWeaponStats.rangeX * (1 + totalRangeModifier)`
   - `triggerDelay` 等按加法合并
8. 与后端提供的 BTK 数据结合，计算最终PTTK曲线并用于绘图。

关键原则：**配件的百分比修正只应用一次**，变体不应事先包含配件修正后的值。

## 变体（variant）与配件（mod）交互规则（要点）
- 变体仅定义差异：例如 `headMultiplier`、`damage`、`isModification: true`。
- 不在变体中预先应用配件的百分比修正，例如不要把 `muzzleVelocity` 人为写成 `base * (1 + mod)`。
- 当配件既有 `damageChange` 又有 `specialRange` 时：
  - 伤害由 `dataQueryName` 指定的变体覆盖；同时若 `specialRange: true`，射程也由该变体覆盖。
- 当配件仅提供百分比修正时（例如常见的长枪管）：直接在 `modifications.js` 指定 `rangeModifier`/`muzzleVelocityModifier` 即可。

## 新增/修改数据的步骤与注意事项
1. 新增武器或变体：
   - 将条目加入 `frontend/src/assets/data/weapons.js`。
   - 变体应设置 `isModification: true` 并只覆盖差异字段。
2. 新增弹药：
   - 在 `frontend/src/assets/data/ammos.js` 增加新条目，确保 `id` 唯一并有对应图片（若需要）。
3. 新增配件：
   - 在 `frontend/src/assets/data/modifications.js` 添加配件对象。
   - 若配件替换伤害模板，设置 `damageChange: true` 并把 `dataQueryName` 指向变体的 `name`。
4. 测试：
   - 在前端 UI（Data Query / Simulator）中选择该武器并添加配件，确认最终属性（射速/初速/射程/爆头倍率）符合预期。

**重要：** 如果需要使配件同时影响伤害和射程，请使用 `damageChange: true` + `specialRange: true` 指向同一变体，而不是把配件修正直接写死到变体中。

## 常见错误与排查建议
- 错误：在变体中手动写入配件作用后的射速/初速/射程 → 会导致效果重复叠加。
  - 解决：把变体恢复为基础值，配件保留 `*Modifier`，让前端运行时计算。
- 错误：变体 `name` 与 `modifications.js` 中 `dataQueryName` 不匹配 → 导致找不到变体。
  - 解决：确保 `dataQueryName` 与 `weapons` 中 `name` 完全一致（区分大小写/空格）。
- 错误：弹药 `id` 重复或 `caliber` 不匹配 → 导致弹药无法应用。
  - 解决：检查 `ammos.js` 中 `id` 唯一性与 `caliber` 字段。

## 示例：为武器添加一个枪管变体
1. 在 `weapons.js` 中添加变体（只改 `name`, `damage` 或 `headMultiplier`, 并加 `isModification: true`）。
2. 在 `modifications.js` 中添加对应配件对象：
   - `effects` 包含 `damageChange: true` 与 `dataQueryName`/`btkQueryName` 指向变体 `name`。
   - 如需改变射程或初速，在 `effects` 中添加 `rangeModifier` 或 `muzzleVelocityModifier`（百分比）。
3. 在前端 UI 验证：选择该配件后应看到伤害模型改变，射速/初速/射程按预期叠加。

## 后续建议
- 增加单元测试或小型脚本验证：扫描 `modifications.js` 中所有 `damageChange` 指向的 `dataQueryName` 是否在 `weapons.js` 中存在。
- 在 CI 中加入脚本，阻止变体中存在不应包含的百分比修正（例如 `muzzleVelocity` 已被手动计算成浮点数不同于基础武器）。
- 维护一份变体命名规范，避免中文/英文/空格导致匹配问题。

---

作者：前端数据维护助手
更新时间：2025-11-15
