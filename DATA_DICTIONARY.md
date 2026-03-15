# 数据字典（Game Data Dictionary）

本文档定义前端业务数据结构、字段含义、单位、计算用途与回退规则，供 AI 在改逻辑时避免字段误用。

## 1. 数据源总览

- 本地静态：`frontend/src/assets/data/`
  - `weapons.js`
  - `ammos.js`
  - `armors.js`
  - `helmets.js`
  - `modifications.js`
- 远程动态：`REACT_APP_DATA_BASE_URL` 下同名 JSON
- 统一访问入口：`frontend/src/hooks/useGameData.js`

## 2. 顶层数据对象

`useGameData` 返回：

```ts
{
  data: {
    weapons: Weapon[],
    ammos: Ammo[],
    armors: Armor[],
    helmets: Helmet[],
    modifications: Modification[],
    manifest?: object
  },
  loading: boolean,
  source: "remote" | "remote-cache" | "local-fallback",
  error: string | null
}
```

## 3. Weapon 字段

来源：`weapons.js`

核心字段：
- `id` string：武器 ID（字符串，存在数字样式但按字符串使用）
- `name` string：武器唯一显示名，也是多处映射键
- `image` string：图片资源路径
- `caliber` string：口径（与 Ammo.caliber 匹配）
- `damage` number：基础肉伤
- `armorDamage` number：基础甲伤
- `fireRate` number：射速（发/分钟）
- `muzzleVelocity` number：初速（m/s）
- `triggerDelay` number：扳机延迟（ms，可选）
- `headMultiplier` number
- `chestMultiplier` number
- `abdomenMultiplier` number
- `upperArmMultiplier` number
- `lowerArmMultiplier` number
- `thighMultiplier` number
- `calfMultiplier` number
- `range1`~`range5` number：射程分段边界（米）
- `decay1`~`decay5` number：对应衰减系数
- `isModification` boolean：是否是“变体武器条目”

约束与约定：
- 变体条目可能只写差异字段，业务层需支持回退到基础武器字段补齐
- `999` 常表示无限段上限，做射程百分比修正时需要特殊处理（不放大）

## 4. Ammo 字段

来源：`ammos.js`

核心字段：
- `id` number
- `caliber` string：用于与武器口径匹配
- `name` string：弹药名（同武器可有多个）
- `rarity` string：稀有度
- `description` string（可选）
- `penetration` number：穿透等级
- `secondaryPenetration` number：对“护甲等级+1”时穿透率
- `sameLevelPenetration` number：对“同级护甲”时穿透率
- `fleshDamageCoeff` number：肉伤系数
- `armor1`~`armor6` number：对 1~6 级护甲甲伤系数
- `image` string

计算用途：
- `calculateSingleHit` 使用 `penetration/secondaryPenetration/sameLevelPenetration`
- 肉伤计算使用 `fleshDamageCoeff`
- 甲伤计算使用 `armor${armorLevel}`

## 5. Armor 字段

来源：`armors.js`

核心字段：
- `id` string
- `name` string
- `level` number：护甲等级（0~6）
- `durability` number：最大耐久
- `chest` number(0/1)
- `abdomen` number(0/1)
- `upperArm` number(0/1)
- `forearm` number(0/1)
- `thigh` number(0/1)
- `calf` number(0/1)
- `image` string

业务注意：
- DataQuery 目前参与后端筛选的是 `chest/abdomen/upperArm`
- 模拟器命中保护判定主要用 `head/chest/abdomen/upperArm`

## 6. Helmet 字段

来源：`helmets.js`

核心字段：
- `id` string
- `name` string
- `level` number（0~6）
- `durability` number
- `image` string

业务注意：
- 头部命中默认受头盔保护（前提：耐久 > 0）

## 7. Modification 字段

来源：`modifications.js`

核心字段：
- `id` string：配件唯一 ID
- `name` string
- `type` string[]：配件类型/槽位类型
- `appliesTo` string[]：适用武器名列表（可能引用武器分组数组）
- `effects` object：效果定义

`effects` 常见子字段：
- 数值修正：
  - `rangeModifier` number（百分比）
  - `fireRateModifier` number（百分比）
  - `muzzleVelocityModifier` number（百分比）
  - `triggerDelay` number（ms）
  - `changeTriggerDelay` boolean
- 变体与查询映射：
  - `damageChange` boolean
  - `specialRange` boolean
  - `dataQueryName` string | `{ [baseGunName: string]: string }`
  - `btkQueryName` string | `{ [baseGunName: string]: string }`
- 槽位依赖：
  - `unlockSlots` string[]
  - `requiresSlots` string[]

业务注意：
- `dataQueryName/btkQueryName` 可能是对象映射，不能假设永远是字符串
- 配件选择必须走 `modSelectionUtils` 处理互斥和依赖关系

## 8. 后端表结构（查询数据）

核心表：`btk_list_results`

主要字段：
- `gun_name` varchar
- `bullet_name` varchar
- `helmet_protection_grade` int
- `armor_protection_grade` int
- `helmet_durability` int
- `armor_durability` int
- `protects_chest` boolean
- `protects_abdominal` boolean
- `protects_upper_arm` boolean
- `distance` int
- `btk_data` json
- `created_at` 或 `create_at`（可选，用于版本区分）

## 9. 回退与兼容规则

- 数据加载回退：
  - 远程加载失败 -> 自动使用本地静态数据
- 变体字段回退：
  - 变体武器缺字段 -> 从基础武器补齐
- 版本数据回退：
  - 无 previous 版本时，`previousAllDataPoints` 用 latest 填充，保证结构稳定
- 时间字段兼容：
  - 后端兼容 `created_at` 与 `create_at`

## 10. AI 修改前检查清单

- 字段名是否与现有代码完全一致（尤其 API 请求体与 SQL 字段）
- 新增字段是否同时更新本地静态与远程 JSON 读取逻辑
- 变体映射字段类型是否支持“字符串 + 对象”
- 是否破坏 `allDataPoints`、`previousAllDataPoints` 的兼容输出
