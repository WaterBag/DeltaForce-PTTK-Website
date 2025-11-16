# 更新日志 (Changelog)

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.4.1] - 2025-11-16

### 🐛 Bug 修复

#### 修复 (Fixed)
- ✅ **修复伤害模拟器布局问题**
  - 修复命中日志区域被挤压隐藏的问题
  - 修复配件列表区域超出可见范围的问题
  - 修复配置区域在内容过多时无法滚动的问题

#### 改进 (Changed)
- 🔄 **优化伤害模拟器布局系统**
  - 左右侧边栏添加 `overflow-y: auto`，支持垂直滚动
  - 配置区域（`.config-section`、`.simulation-controls`、`.target-status`）设置 `flex-shrink: 0`，防止压缩
  - 命中日志容器（`.hit-log-container`）设置 `min-height: 150px` 和 `flex-shrink: 1`，允许收缩但保持最小高度
  - 配件区域（`.mod-section`）设置 `min-height: 180px` 和 `flex-shrink: 1`，允许收缩但保持最小高度
  - 汇总面板（`.summary-panel`）设置 `flex-shrink: 0`，防止压缩
  - 移除不合理的固定高度约束（如 `.hit-log-list` 的 `height: 180px`）
  - 移除冲突的 CSS 属性（如 `.mod-section` 的 `flex: 1` 和 `max-height`）

#### 技术细节 (Technical Details)

**布局修复前的问题**:
```
问题表现：
1. 命中日志列表被压缩到几乎不可见
2. 配件列表区域内容超出视窗，无法滚动查看
3. 配置元素挤在一起，用户体验差

根本原因：
- 缺少父容器的 overflow-y: auto
- flex-shrink 属性使用不当
- 固定高度与 flexbox 布局冲突
```

**布局修复方案**:
```css
/* 1. 父容器支持滚动 */
.left-panel, .right-panel {
  overflow-y: auto;  /* 内容超出时显示滚动条 */
}

/* 2. 固定区域防止压缩 */
.config-section, .simulation-controls, .target-status, .summary-panel {
  flex-shrink: 0;  /* 不允许收缩 */
}

/* 3. 弹性区域允许收缩但保持最小高度 */
.hit-log-container {
  min-height: 150px;  /* 最小高度保证可见性 */
  flex-shrink: 1;     /* 允许收缩 */
}

.mod-section {
  min-height: 180px;  /* 最小高度保证可见性 */
  flex-shrink: 1;     /* 允许收缩 */
}

/* 4. 内部列表自适应高度 */
.hit-log-list {
  flex: 1;            /* 占满剩余空间 */
  overflow-y: auto;   /* 内容超出时显示滚动条 */
  /* 移除固定 height: 180px */
}
```

**布局层次结构**:
```
.left-panel / .right-panel (overflow-y: auto)
├─ .config-section (flex-shrink: 0) ✓ 固定
├─ .simulation-controls (flex-shrink: 0) ✓ 固定
├─ .target-status (flex-shrink: 0) ✓ 固定
├─ .hit-log-container (min-height: 150px, flex-shrink: 1) ↕ 弹性
│  ├─ h4 (flex-shrink: 0)
│  └─ .hit-log-list (flex: 1, overflow-y: auto)
├─ .mod-section (min-height: 180px, flex-shrink: 1) ↕ 弹性
│  └─ .mod-list-wrapper (flex: 1, overflow-y: auto)
└─ .summary-panel (flex-shrink: 0) ✓ 固定
```

#### 用户体验改进 (UX Improvements)
- ✅ 命中日志始终可见，最小高度 150px
- ✅ 配件列表始终可访问，支持滚动浏览所有配件
- ✅ 配置元素不再被压缩，布局更加合理
- ✅ 整体页面支持滚动，适应不同屏幕高度

---

## [1.4.0] - 2025-01-16

### 🎉 重大功能：数据图鉴系统

#### 新增 (Added)
- ✨ **数据图鉴页面** (`DataLibrary.js`)
  - 武器/弹药双标签页设计
  - 搜索、筛选、排序功能
  - 实时统计显示（共X把武器/种弹药）
  - 用户提示："点击卡片可展开配件配置"

- ✨ **武器列表组件** (`WeaponList.jsx`)
  - 折叠式卡片展示所有武器属性
  - 显示甲伤/肉伤、每秒甲伤/每秒肉伤
  - 显示射速/初速、部位倍率（头/胸/腹/手）
  - 迷你射程衰减图（右侧显示）
  - 点击卡片展开配件配置面板
  - 支持变体武器属性正确显示

- ✨ **弹药列表组件** (`AmmoList.jsx`)
  - 卡片式展示所有弹药属性
  - 稀有度颜色系统（背景色15%透明度）
  - 弹药名称使用稀有度纯色
  - 显示穿透等级、肉伤系数
  - 完整显示1-6级护甲伤害系数

- ✨ **配件面板组件** (`WeaponModPanel.jsx`)
  - 展开式配件选择面板
  - 按配件类型分组显示
  - 单选/多选逻辑（同类型互斥）
  - 排除变体武器配件（damageChange=true）
  - 卡片式配件按钮，选中高亮效果

- ✨ **修改后属性组件** (`ModifiedWeaponStats.jsx`)
  - 三栏布局展示配件效果
  - 左栏：配件选择
  - 中栏：射速/初速/每秒甲伤/每秒肉伤（带变化百分比）
  - 右栏：完整射程衰减图
  - 变体武器配件修改器正确应用
  - 支持 showOnlyStats 和 showOnlyChart 模式

- ✨ **射程衰减图表组件**
  - `RangeDecayChart.jsx`: 迷你版（200x80px）
  - `RangeDecayChartFull.jsx`: 完整版（200px高）
  - 阶梯状衰减曲线（stepBefore 类型）
  - 射程≥500显示为∞（无限远）
  - 取消数据点强调（dot=false, activeDot=false）
  - Tooltip 显示距离和伤害百分比

- ✨ **变体武器配件兼容性系统** (`modifications.js`)
  - 定义 variantWeapons 映射表
  - 自动扩展配件的 appliesTo 数组
  - 排除变体武器已占用的配件类型
  - `expandModificationsForVariants()` 函数自动处理

#### 改进 (Changed)
- 🔄 **数据架构优化**
  - 变体武器数据恢复为基础值（移除预应用的修改器）
  - MK4-深空镀铬枪管：muzzleVelocity 575→475，fireRate 872→793
  - ASh-12-战斧重型枪管：添加 fireRateModifier=-0.2, muzzleVelocityModifier=0.47
  - 修改器在运行时动态应用，不预计算

- 🔄 **UI/UX优化**
  - 统一背景色为 `#f4f5f7`（与 main-content 一致）
  - Tab栏上圆角（8px 8px 0 0）
  - 列表容器下圆角（0 0 8px 8px）
  - 图表区域下圆角并匹配背景色
  - 梯度背景、阴影、悬停效果
  - 响应式设计（平板、移动端适配）

- 🔄 **配件系统增强** (`modifications.js`)
  - 新增 MK4 通用配件支持（添加到 general 和 smg 列表）
  - 新增 MP7 月影镀铬枪管组合配件
  - 新增 MK4 击剑手枪管配件
  - 修复 MK4-深空镀铬枪管配件效果（fireRateModifier=0.1, muzzleVelocityModifier=0.21, specialRange=true）

- 🔄 **弹药数据修正** (`ammos.js`)
  - 7N21 红鼠窝：名称从"7N21(仅存在于靶场)"改为"7N21 红鼠窝"

- 🔄 **武器数据修正** (`weapons.js`)
  - MK4-深空镀铬枪管射程调整：
    - range1: 25, decay1: 1
    - range2: 35, decay2: 0.85
    - range3: 45, decay3: 0.65
    - range4: 999, decay4: 0.55
  - 删除 AS-Val 武器（id: 3016）

- 🔄 **侧边栏导航扩展** (`Sidebar.jsx`)
  - 新增"数据图鉴"导航项
  - 三个视图：概率TTK折线图、伤害模拟器、数据图鉴

- 🔄 **应用路由扩展** (`App.js`)
  - 导入 DataLibrary 组件
  - 添加 dataLibrary 视图路由

- 🔄 **布局优化** (`Layout.css`)
  - 修改 app-layout 为固定高度（height: 100vh）
  - 修改 app-content 为 flex: 1（替代 flex-grow: 1）
  - 添加 overflow: hidden 和 min-height: 0

- 🔄 **伤害衰减图表修正** (`DamageDecayChart.jsx`)
  - 范围≥500的射程段视为无限（之前仅999）
  - 统一无限远判断逻辑

- 🔄 **数据查询页面样式调整** (`DataQuery.css`)
  - results-panel 背景色改为 `#f4f5f7`
  - 添加下圆角 `border-radius: 0 0 8px 8px`

#### 样式文件 (Styling)
- 🎨 **新增样式文件**
  - `DataLibrary.css`: 数据图鉴主容器和 Tab 样式
  - `WeaponList.css`: 武器列表卡片和展开面板样式
  - `AmmoList.css`: 弹药列表卡片样式
  - `WeaponModPanel.css`: 配件选择面板样式
  - `ModifiedWeaponStats.css`: 修改后属性显示样式
  - `RangeDecayChart.css`: 迷你射程图样式
  - `RangeDecayChartFull.css`: 完整射程图样式

- 🎨 **设计系统**
  - 主色调：`#4a9eff`（蓝色）
  - 背景色：`#f4f5f7`（浅灰）
  - 边框色：`#e3e6ea`（中灰）
  - 卡片背景：`#ffffff`（纯白）
  - 圆角：8px（大元素）、6px（中元素）、4px（小元素）
  - 阴影：`0 2px 4px rgba(0,0,0,0.04)` → `0 4px 12px rgba(74,158,255,0.15)`（悬停）
  - 字体大小：11-16px（自适应武器名称长度）

#### 技术细节 (Technical Details)

**变体武器配件应用逻辑**:
```javascript
// ModifiedWeaponStats.jsx
if (weapon.isModification) {
  // 1. 查找对应的变体配件
  const variantMod = modifications.find(m => 
    m.effects?.dataQueryName === weapon.name
  );
  
  // 2. 应用基础修改器
  baseFireRate *= (1 + variantMod.effects.fireRateModifier);
  baseMuzzleVelocity *= (1 + variantMod.effects.muzzleVelocityModifier);
  baseRange *= (1 + variantMod.effects.rangeModifier);
  
  // 3. 如有选择额外配件,在基础上叠加
  totalModifier = baseModifier + selectedModsModifiers;
  
  // 4. 从原始武器数据应用累积修改器
  finalValue = weapon.baseStat × (1 + totalModifier);
}
```

**配件兼容性自动扩展**:
```javascript
// modifications.js
function expandModificationsForVariants(mods) {
  return mods.map(mod => {
    const newAppliesTo = [...mod.appliesTo];
    
    mod.appliesTo.forEach(weapon => {
      Object.entries(variantWeapons).forEach(([variantName, variantInfo]) => {
        if (variantInfo.base === weapon) {
          // 检查配件类型是否与变体排除类型冲突
          const hasConflict = mod.type.some(type => 
            variantInfo.excludeTypes.includes(type)
          );
          
          if (!hasConflict) {
            newAppliesTo.push(variantName);
          }
        }
      });
    });
    
    return { ...mod, appliesTo: newAppliesTo };
  });
}
```

**稀有度颜色映射**:
```javascript
const rarityMap = {
  '红': { color: '#ff4444', emoji: '🔴' },
  '橙': { color: '#ff9800', emoji: '🟠' },
  '紫': { color: '#9c27b0', emoji: '🟣' },
  '蓝': { color: '#2196f3', emoji: '🔵' },
  '绿': { color: '#4caf50', emoji: '🟢' },
  '白': { color: '#e0e0e0', emoji: '⚪' },
};

// 背景色：15%透明度
backgroundColor: `${color}26`  // 26 = 15% in hex

// 名称颜色：纯色
color: color
```

#### 文件结构 (File Structure)
```
frontend/src/
├── pages/
│   ├── DataLibrary.js           # 数据图鉴主页面
│   ├── DataLibrary.css
│   ├── DataQuery.css            # 更新背景色
├── components/
│   ├── data_library/            # 新增目录
│   │   ├── WeaponList.jsx
│   │   ├── WeaponList.css
│   │   ├── AmmoList.jsx
│   │   ├── AmmoList.css
│   │   ├── WeaponModPanel.jsx
│   │   ├── WeaponModPanel.css
│   │   ├── ModifiedWeaponStats.jsx
│   │   ├── ModifiedWeaponStats.css
│   │   ├── RangeDecayChart.jsx
│   │   ├── RangeDecayChart.css
│   │   ├── RangeDecayChartFull.jsx
│   │   └── RangeDecayChartFull.css
│   ├── layout/
│   │   ├── Sidebar.jsx          # 新增导航项
│   │   └── Layout.css           # 布局优化
│   └── simulator/
│       └── DamageDecayChart.jsx  # 修正范围判断
├── assets/data/
│   ├── weapons.js               # 修正变体数据
│   ├── modifications.js         # 新增配件和兼容性系统
│   └── ammos.js                 # 修正弹药名称
└── App.js                       # 新增路由
```

#### 用户体验改进 (UX Improvements)
- ✅ 一站式数据查询，无需切换页面
- ✅ 直观的卡片式展示，信息密度适中
- ✅ 点击展开配件配置，实时查看效果
- ✅ 统一的视觉设计语言
- ✅ 流畅的动画和过渡效果
- ✅ 清晰的颜色区分（稀有度、属性变化）
- ✅ 完整的响应式支持

#### 代码质量 (Code Quality)
- 🧹 **组件化设计**
  - 单一职责原则
  - 可复用的展示组件
  - 清晰的数据流

- 🧹 **性能优化**
  - useMemo 缓存计算结果
  - useCallback 避免重复渲染
  - 按需展开，减少初始渲染

- 📝 **完善的注释**
  - JSDoc 函数注释
  - 详细的代码逻辑说明
  - 数据结构和映射关系说明

---

## [S7 阿萨拉赛季更新] - 2025-01-15

### 🎉 重大更新：S7 阿萨拉赛季内容同步

#### 新增武器 (Added Weapons)
- ✨ **MK4 冲锋枪** (`weapons.js`, id: `1011`)
  - 口径：4.6×30mm
  - 射速：950 RPM
  - 初速：720 m/s
  - 射程：23m / 58m / 999m
  - 部位倍率：头部 4.2x，胸部 1.0x，腹部 0.65x，四肢 0.5x
  - 弹容量：40发
  
- ✨ **MK4 - 深空镀铬枪管变体** (`weapons.js`, id: `10111`)
  - isModification: true
  - 射速提升：950 → 1000 RPM
  - 初速提升：720 → 760 m/s
  - 射程扩展：23/58/999 → 25/65/999

#### 新增武器配件 (Added Modifications)
- ✨ **MK4 深空镀铬枪管** (`modifications.js`)
  - 效果：damageChange (切换到深空镀铬枪管变体)
  - 技术实现：dataQueryName/btkQueryName 映射到变体ID '10111'

- ✨ **ASh-12 战斧重型枪管** (`modifications.js`)
  - 效果：damageChange (切换到战斧重型枪管变体)
  - 对应变体 (`weapons.js`, id: `30051`)：
    - 胸部倍率：1.0 → 1.15x
    - 腹部倍率：1.0 → 0.9x

- ✨ **SG552 猎犬轻型枪管** (`modifications.js`)
  - 效果：无特殊效果（基础配件）
  - 为未来扩展预留

#### 武器平衡调整 (Balance Changes)
- 🔄 **沙漠之鹰 (Desert Eagle)** (`weapons.js`, id: `2003`)
  - 爆头倍率提升：2.46x → 2.8x (+13.8%)
  - 有效射程缩短：35/77m → 15/30m

- 🔄 **AR 特勤一体消音组合** (`modifications.js`)
  - 新增效果：damageChange (增强爆头倍率)
  - 新增3个武器变体 (`weapons.js`)：
    - **M4A1 - AR特勤变体** (id: `30011`): headMultiplier 1.9 → 2.5
    - **M16A4 - AR特勤变体** (id: `30071`): headMultiplier 1.9 → 2.5
    - **CAR-15 - AR特勤变体** (id: `30151`): headMultiplier 1.9 → 2.5
  - 配件技术实现：
    - damageChange: true
    - dataQueryName/btkQueryName 武器名映射

#### 新增弹药 (Added Ammo)
- ✨ **独头 APX** (`ammos.js`, id: `508`, 口径: 12 Gauge)
  - 肉伤系数：5.3
  - 用途：霰弹枪高伤害独头弹

- ✨ **BT +P** (`ammos.js`, id: `706`, 口径: 5.45×39mm)
  - 肉伤系数：1.1
  - 用途：5.45 步枪增强弹药

#### 弹药转为正式服 (Ammo Released)
- 🔄 **.45 ACP Super** (id: `307`)
  - 移除"测试服"标记
  - 肉伤系数：1.3（保持不变）

- 🔄 **.50 AE AP** (id: `404`)
  - 移除"测试服"标记
  - 穿透系数调整：
    - 次级穿透：1.0 → 0.75
    - 同级穿透：0.8 → 0.5
  - 设计意图：降低护甲穿透能力，平衡性调整

- 🔄 **4.6×30mm Ultra SX** (id: `1304`)
  - 移除弹药
  - 修复 ID 重复问题（之前 id 与其他弹药冲突）

#### 技术改进 (Technical Improvements)
- 📝 **数据使用原理文档** (`frontend/docs/data-usage.md`)
  - 完整的数据驱动架构说明
  - 变体系统设计原则与使用规范
  - 配件效果处理流程详解
  - 常见错误与调试指南
  - 实战示例与最佳实践

- 🔄 **变体数据优化**
  - 移除变体中预计算的属性值（遵循 Minimal Variant 原则）
  - 确保所有修正值在运行时动态应用
  - 提升数据维护性和一致性

#### Bug 修复 (Bug Fixes)
- ✅ **修复 M250 - 钛金长枪管变体** (`weapons.js`, id: `40021`)
  - 问题：腹部倍率重复叠加配件效果
  - 修正：abdomenMultiplier: 0.9 → 0.7（移除预计算值）

- ✅ **修复 SR25 - 瞬息短枪管变体** (`weapons.js`, id: `60031`)
  - 问题：射速和初速包含预计算修正值
  - 修正：
    - fireRate: 448 → 364（-15%应由配件应用）
    - muzzleVelocity: 625 → 550（-12%应由配件应用）

- ✅ **修复 Marlin 杠杆步枪 - 犀牛杠杆** (`weapons.js`, id: `60091`)
  - 问题：射速预计算了配件效果
  - 修正：fireRate: 75 → 100（+33%应由配件应用）

- ✅ **修复 Marlin 杠杆步枪 - 蜂鸟杠杆** (`weapons.js`, id: `60092`)
  - 问题：射速预计算了配件效果
  - 修正：fireRate: 200 → 100（+100%应由配件应用）

#### 数据文件变更统计 (File Changes)
- **frontend/src/assets/data/weapons.js**
  - 新增：6条变体数据 + 1条基础武器
  - 修改：5条变体数据修正 + 1条基础武器平衡调整

- **frontend/src/assets/data/modifications.js**
  - 新增：3个配件条目
  - 修改：1个配件增强（AR特勤）

- **frontend/src/assets/data/ammos.js**
  - 新增：2种弹药
  - 修改：3种弹药状态更新

- **frontend/docs/data-usage.md**
  - 新建：完整的技术文档（约200行）

#### 设计说明 (Design Notes)
- 🎯 **变体系统使用原则**：
  - 变体只存储差异属性（Minimal Variant Principle）
  - 配件通过 damageChange/specialRange 引用变体
  - 所有百分比修正在运行时由 dataProcessor.js 动态应用
  - 公式：finalValue = baseValue × (1 + totalModifier)

- 🎯 **数据一致性保证**：
  - 修复历史遗留的预计算问题
  - 统一数据处理流程
  - 提升未来维护效率

---

## [1.3.1] - 2025-11-12

### 🐛 数据处理修复

#### 修复 (Fixed)
- ✅ **修复数据索引与距离映射错误**
  - 修复后端返回重复距离数据导致的索引错乱问题
  - 添加基于原始距离的去重处理
  - 避免出现异常的修正距离值（如 1178.82m、1298.7m）
  - 确保索引与射程档位的正确映射关系

#### 改进 (Changed)
- 🔄 **优化期望BTK调试输出**
  - 分离显示"原始距离"和"修正后距离"
  - 添加"索引"列，便于追踪映射关系
  - 改进调试信息格式，更易于排查问题

#### 技术细节 (Technical Details)

**修复前问题**:
```
后端返回数据：10m, 51m, 71m, 71m (重复)
↓
数组索引：[0, 1, 2, 3]
↓
距离映射：
- index=0 → 0m ✓
- index=1 → range1 ✓
- index=2 → range2 ✓
- index=3 → range3 ✗ (应该跳过重复数据)
↓
结果：出现异常距离值 1178.82m
```

**修复后逻辑**:
```javascript
// 1. 去重处理
const uniqueBtkDataPoints = [];
const seenDistances = new Set();
for (const point of sortedBtkDataPoints) {
  if (!seenDistances.has(point.distance)) {
    seenDistances.add(point.distance);
    uniqueBtkDataPoints.push(point);
  }
}

// 2. 正确的索引映射
// index=0 → distance=0m
// index=1 → distance=range1
// index=2 → distance=range2
// ...
```

**改进的调试输出**:
```
📊 [武器名] 期望BTK数据:
┌─────┬──────┬───────────┬──────────┬──────┬────────┐
│索引 │原始  │修正后距离 │原始BTK   │期望  │命中率  │
│     │距离  │           │数据      │BTK   │        │
├─────┼──────┼───────────┼──────────┼──────┼────────┤
│  0  │ 10m  │    0m     │ [...]    │ 4.33 │ 100%   │
│  1  │ 51m  │   59m     │ [...]    │ 4.85 │ 100%   │
│  2  │ 71m  │  82.6m    │ [...]    │ 5.36 │ 100%   │
└─────┴──────┴───────────┴──────────┴──────┴────────┘
```

---

## [1.3.0] - 2025-11-12

### 🎉 重大功能：护甲切换智能确认系统

#### 新增 (Added)
- ✨ **护甲切换确认对话框** (`ConfirmDialog.jsx`)
  - 智能检测护甲/头盔切换与耐久值变化
  - 双区域设计：模拟数据警告区（橙色） + 后端数据信息区（蓝色）
  - **智能预查询结果显示**：
    - 显示成功配置列表（绿色边框，✓ 图标）
    - 显示失败配置列表（红色边框，✗ 图标，删除线效果）
    - 实时统计：X 个配置将保留，X 个配置将被移除
  - 两个操作按钮："取消" | "确认切换"
  - 继承 `ModificationModal` 的设计风格

- ✨ **护甲切换智能检测**
  - 使用 `prevArmorConfigRef` 跟踪护甲/头盔 ID 变化
  - 精确区分三种场景：
    - 首次设置护甲配置
    - 护甲/头盔切换（触发确认对话框）
    - 仅耐久值调整（自动刷新）
  - 避免误触发确认对话框

- ✨ **带数据验证的刷新功能** (`refreshComparisonLinesWithCheck`)
  - 多层数据有效性检查：
    - 空响应检测
    - 子弹匹配验证（检查新护甲下子弹是否可用）
    - 数据点有效性验证（检查 `btk_data` 格式和内容）
  - 自动移除无效配置
  - 返回成功/失败统计信息
  - 详细的控制台警告日志

- ✨ **智能预查询机制**
  - 预先查询所有后端配置的数据有效性
  - **全部成功时直接应用，不弹窗打扰用户**
  - 仅当有失败配置时才显示确认对话框
  - 确认时直接使用预查询结果，避免重复查询后端
  - 大幅提升用户体验，减少不必要的操作步骤

- ✨ **取消切换恢复功能**
  - 点击"取消"按钮恢复到切换前的护甲/头盔
  - 同时恢复耐久值设置
  - 保持对比列表完全不变
  - 使用 `isRestoringArmorRef` 防止恢复时触发二次弹窗

- 📊 **期望BTK调试输出**
  - 在控制台输出每个配置的详细BTK数据
  - 使用 `console.table()` 格式化显示
  - 显示字段：距离、原始BTK数据、期望BTK、命中率
  - 便于排查数据计算问题

#### 改进 (Changed)
- 🔄 **可用武器列表刷新优化**
  - 提取 `queryAvailableGuns` 为独立的 `useCallback` 函数
  - 确认切换后自动刷新可用武器列表
  - 包含完整的武器过滤逻辑（4位数ID、基础武器验证）
  - 包含护甲部位保护参数

- 🔄 **护甲选择器简化**
  - 移除 `handleHelmetSelect` 和 `handleArmorSelect` 中的清空逻辑
  - 移除旧的 `window.confirm` 弹窗
  - 所有护甲切换处理统一由 `useEffect` 管理
  - 精简代码，提高可维护性

- 🔄 **数据处理增强** (`dataProcessor.js`)
  - 添加期望BTK计算的详细日志
  - 记录每个射程段的原始BTK数据
  - 显示距离修正信息（配件影响）
  - 输出命中率应用情况

- 🔄 **扩展 `prevArmorConfigRef` 结构**
  ```javascript
  // v1.2.0 (旧)
  { helmetDurability, armorDurability }
  
  // v1.3.0 (新)
  { helmetId, helmetDurability, armorId, armorDurability }
  ```

#### 修复 (Fixed)
- ✅ **修复配置未正确移除的问题**
  - 增强数据验证逻辑，检查子弹是否在新护甲下可用
  - 验证 `btk_data` 的有效性（非空、可解析、有数据）
  - 确保所有无效配置都能被正确识别和移除

- ✅ **修复可用武器列表不刷新问题**
  - 护甲切换确认后正确调用 `queryAvailableGuns()`
  - 使用统一的武器查询函数，避免重复代码

- ✅ **修复护甲切换直接清空列表的问题**
  - 移除选择器中的 `setComparisonLines([])` 调用
  - 改为通过确认对话框处理数据更新

#### 样式优化 (Styling)
- 🎨 **新增 `ConfirmDialog.css`**
  - 警告区域样式（橙色边框和背景）
  - 信息区域样式（蓝色边框和背景）
  - **成功配置列表样式**（`.success-list`）
    - 绿色左边框 (#4caf50)
    - 浅绿背景 (#f1f8f4)
    - ✓ 图标前缀
  - **失败配置列表样式**（`.failed-list`）
    - 红色左边框 (#f44336)
    - 浅红背景 (#ffebee)
    - ✗ 图标前缀
    - 删除线效果（text-decoration）
    - 80% 透明度
  - 配置列表样式（卡片式设计）
  - 按钮样式（取消灰色、确认蓝色）
  - 响应式设计（平板、移动端适配）
  - 淡入动画效果

#### 技术细节 (Technical Details)

**护甲切换检测流程**:
```
用户选择新护甲/头盔
    ↓
handleArmorSelect / handleHelmetSelect
    ↓
更新 selectedArmor / selectedHelmet 状态
    ↓
useEffect 检测变化
    ↓
prevArmorConfigRef 判断变化类型
    ↓
┌─────────────────┬──────────────────┬─────────────────┐
│  首次设置       │  护甲切换        │  耐久值调整     │
├─────────────────┼──────────────────┼─────────────────┤
│ helmetId=null   │ helmetId changed │ 仅 durability   │
│ armorId=null    │ armorId changed  │ changed         │
├─────────────────┼──────────────────┼─────────────────┤
│ 直接查询武器    │ ↓ 智能预查询     │ 自动刷新数据    │
│                 │ preCheckComparison│                 │
│                 │ Lines()           │                 │
│                 │ ↓                 │                 │
│                 │ 全部成功?         │                 │
│                 │ Yes → 直接应用    │                 │
│                 │ No → 显示确认框   │                 │
└─────────────────┴──────────────────┴─────────────────┘
```

**智能预查询流程** (新增):
```
护甲切换检测
    ↓
有模拟数据? → Yes → 直接弹窗（不预查询）
    ↓ No
有后端数据? → Yes → 预查询 preCheckComparisonLines()
    ↓                    ↓
    No              查询每个配置的数据有效性
    ↓                    ↓
直接查询武器          分类：successLines | failedLines
                      ↓
                  全部成功 (failedCount=0)?
                      ↓
            ┌─────────┴─────────┐
            │ Yes               │ No
            ↓                   ↓
    直接应用结果           显示确认对话框
    不弹窗打扰用户          ├─ 显示成功配置（绿色✓）
    setComparisonLines()   ├─ 显示失败配置（红色✗删除线）
                            └─ 保存预查询结果到 confirmDialogConfig
                                ↓
                          用户点击"确认切换"
                                ↓
                          直接使用预查询结果
                          无需重复查询后端
```

**确认对话框数据流**:
```
检测到护甲切换
    ↓
筛选模拟数据和后端数据
    ↓
┌────────────────────────┬────────────────────────┐
│ 有模拟数据             │ 仅后端数据             │
├────────────────────────┼────────────────────────┤
│ 直接弹窗               │ 预查询后端数据         │
│ 不预查询               │ preCheckComparisonLines│
│ (模拟数据无法预验证)   │ ↓                      │
│                        │ failedCount > 0?       │
│                        │ ↓                      │
│                        │ Yes → 弹窗显示结果     │
│                        │ No → 直接应用不弹窗    │
└────────────────────────┴────────────────────────┘
    ↓
设置 confirmDialogConfig { 
  simulatedLines,
  backendLines,
  preQueryResult: { successLines, failedLines, successCount, failedCount }
}
    ↓
显示 ConfirmDialog
    ↓
┌──────────────────────────────┬──────────────────────────┐
│ 用户点击"确认切换"           │ 用户点击"取消"           │
├──────────────────────────────┼──────────────────────────┤
│ handleConfirmArmorSwitch     │ handleCancelArmorSwitch  │
│ ├─ 检查 preQueryResult       │ ├─ 设置 isRestoringArmorRef│
│ │   存在? → 直接使用         │ │   = true (防止二次弹窗) │
│ │   不存在? → 重新查询       │ ├─ 恢复 selectedHelmet   │
│ ├─ 移除无效配置              │ ├─ 恢复 selectedArmor    │
│ ├─ 保留模拟数据              │ ├─ 恢复耐久值            │
│ ├─ 显示统计提示              │ ├─ 恢复 prevArmorConfigRef│
│ └─ queryAvailableGuns()      │ └─ 保持对比列表不变      │
└──────────────────────────────┴──────────────────────────┘
```

**数据验证逻辑**:
```javascript
// 1. 空响应检测
if (!gunDetails?.allDataPoints?.length) return null;

// 2. 子弹匹配检测 (新增!)
const hasMatchingBullet = gunDetails.allDataPoints.some(
  point => point.bullet_name === line.bulletName
);
if (!hasMatchingBullet) return null;

// 3. 数据点有效性检测 (新增!)
const validDataPoints = gunDetails.allDataPoints.filter(point => {
  if (!point.btk_data) return false;
  // 检查字符串或数组格式
  if (typeof point.btk_data === 'string') {
    const parsed = JSON.parse(point.btk_data);
    return Array.isArray(parsed) && parsed.length > 0;
  }
  return Array.isArray(point.btk_data) && point.btk_data.length > 0;
});
if (validDataPoints.length === 0) return null;
```

**期望BTK调试输出**:
```javascript
// dataProcessor.js 中添加
const eBtkDebugData = [];
sortedBtkDataPoints.map(point => {
  const eBtk = EbtkCalculator(point.btk_data, hitRate);
  eBtkDebugData.push({
    距离: `${point.distance}m (修正后: ${correctDistance}m)`,
    原始BTK数据: point.btk_data,
    期望BTK: eBtk.toFixed(2),
    命中率: `${(hitRate * 100).toFixed(0)}%`,
  });
});
console.log(`📊 [${displayName}] 期望BTK数据:`);
console.table(eBtkDebugData);
```

#### 用户体验改进 (UX Improvements)
- ✅ 护甲切换时不会直接清空对比列表
- ✅ 显示清晰的确认对话框，用户可选择继续或取消
- ✅ 取消操作完全恢复之前的状态
- ✅ **智能预查询：后端数据全部成功时直接应用，不弹窗打扰用户**
- ✅ **仅在有失败配置时才弹窗，清晰显示成功和失败列表**
- ✅ **视觉区分：成功配置（绿色✓），失败配置（红色✗删除线）**
- ✅ **统计信息：实时显示 X 个配置保留，X 个配置移除**
- ✅ 自动移除无效配置，显示统计信息
- ✅ 保留模拟数据并显示警告
- ✅ 详细的控制台日志辅助调试

#### 代码质量 (Code Quality)
- 🧹 **移除重复代码**
  - 统一武器查询逻辑到 `queryAvailableGuns`
  - 移除 `handleArmorSelect` 中的重复清空逻辑

- 🧹 **优化 ESLint 警告**
  - 修复字符串引号不一致问题
  - 统一使用单引号

- 📝 **完善注释和文档**
  - 添加数据验证逻辑的详细注释
  - 添加控制台日志的上下文说明

#### 已知问题 (Known Issues)
- ⚠️ 模拟数据在护甲切换后无法自动重新计算（需 Phase 3 前端模拟功能）

---

## [1.2.0] - 2025-11-12

### 🎉 重大功能：命中率系统与护甲耐久自动刷新

#### 新增 (Added)
- ✨ **命中率控制系统**
  - 将命中率控制集成到配件选择弹窗中
  - 使用 `UniversalSlider` 组件保持 UI 风格统一
  - 实现 localStorage 记忆功能（`defaultHitRate` 键）
  - 命中率范围：30%-100%，步进 5%
  - 按钮显示当前命中率："添加至对比 (X% 命中率)"

- ✨ **护甲耐久自动刷新**
  - 调整护甲耐久时自动重新查询 BTK 数据
  - 保持武器配置（枪械、子弹、配件）不变
  - 智能区分：首次设置 / 护甲切换 / 耐久调整
  - 使用 `useRef` + `useCallback` 解决异步闭包问题
  - 防重入保护避免重复刷新

- ✨ **模拟数据保护机制**
  - 检测自定义模拟数据的存在
  - 切换护甲/头盔时弹出确认框
  - 显示警告：模拟数据基于旧护甲配置

- 📁 **新增游戏常量文件** (`frontend/src/assets/data/gameConstants.js`)
  - 玩家基础血量常量
  - 默认部位命中概率
  - PD12 双头弹钝伤系数
  - 部位索引映射
  - 护甲防护字段映射
  - 为 Phase 3 前端模拟功能预留完整接口

#### 改进 (Changed)
- 🔄 **对比列表简化** (`ComparisonList.jsx`)
  - 移除所有命中率显示和控制 UI
  - 恢复简洁的列表样式
  - 只显示：颜色指示、武器-子弹名、配件数量、删除按钮
  - 优化删除按钮为绝对定位

- 🔄 **配件弹窗优化** (`ModificationModal.jsx`)
  - 集成命中率滑块控制
  - 改用 block 布局替代 flex，修复元素压缩问题
  - 使用 `margin-bottom` 替代 `gap` 设置间距
  - 添加命中率百分比后缀样式（`.hit-rate-universal-slider`）
  - 优化配件效果 tooltip 显示

- 🔄 **数据处理优化** (`dataProcessor.js`)
  - 集成命中率调整计算
  - 公式：`adjustedEbtk = baseEbtk / hitRate`
  - 示例：5发击杀 @ 80%命中率 → 6.25发期望
  - 改进 `EbtkCalculator` 函数支持命中率参数

- 🔄 **DataQuery 页面重构**
  - 引入 `comparisonLinesRef` 同步最新对比线数据
  - 引入 `prevArmorConfigRef` 追踪护甲配置变化
  - 引入 `isRefreshingRef` 防止重复刷新
  - 实现 `refreshComparisonLines` 异步刷新函数
  - 优化 `useEffect` 依赖项，避免无限循环

#### 修复 (Fixed)
- ✅ **API 数据结构统一**
  - 修复刷新功能中的数据结构不匹配问题
  - 统一使用 `allDataPoints` 格式
  - 与 ModificationModal 数据传递保持一致
  - 移除错误的 `gunDetails.bullets` 查找逻辑

- ✅ **弹窗布局修复**
  - 修复 flex 布局导致的元素上下压缩问题
  - 修复弹窗滚动功能
  - 优化移动端显示效果

- ✅ **闭包陷阱修复**
  - 使用 `useRef` 避免异步函数中捕获旧状态
  - 确保刷新时访问最新的对比线数据

#### 代码质量 (Code Quality)
- 🧹 **调试日志清理**
  - 移除所有非错误的 `console.log`
  - 保留关键错误日志用于生产环境追踪
  - 清理文件：
    - `ComparisonList.jsx`
    - `ModificationModal.jsx`
    - `DataQuery.js`
    - `dataProcessor.js`

- 🧹 **代码注释优化**
  - 更新 `EbtkCalculator` 函数注释
  - 添加命中率调整公式说明
  - 优化游戏常量文件的详细注释

#### 样式优化 (Styling)
- 🎨 **CSS 改进**
  - `ComparisonList.css`: 优化删除按钮定位和响应式样式
  - `ModificationModal.css`: 修复布局、添加命中率后缀样式
  - 统一配件指示器（mods-indicator）样式
  - 改进响应式断点处理

#### 技术细节 (Technical Details)

**命中率数据流**:
```
ModificationModal (用户设置)
    ↓ (保存到 localStorage)
    ↓ (传递给 handleAddComparison)
comparisonLines (包含 hitRate: 0.3-1.0)
    ↓ (传递给 processChartData)
dataProcessor (应用命中率调整)
    ↓ (计算 adjustedEbtk)
TtkChart (显示调整后的曲线)
```

**护甲耐久刷新流程**:
```
用户调整耐久滑块
    ↓
useEffect 检测 armorDurability 变化
    ↓
prevArmorConfigRef 判断是否仅耐久变化
    ↓ (是)
refreshComparisonLines 并行查询所有配置
    ↓
comparisonLinesRef.current 获取最新数据
    ↓
fetchGunDetails 获取新 BTK 数据
    ↓
更新 comparisonLines.btkDataPoints
    ↓
触发图表重新渲染
```

**Ref 使用模式**:
```javascript
// 1. 创建 ref
const comparisonLinesRef = useRef([]);

// 2. 同步 state 到 ref
useEffect(() => {
  comparisonLinesRef.current = comparisonLines;
}, [comparisonLines]);

// 3. 在异步函数中访问最新值
const refreshComparisonLines = useCallback(async () => {
  const currentLines = comparisonLinesRef.current; // ✅ 始终是最新值
}, [/* 不依赖 comparisonLines */]);
```

#### 待办事项 (Todo)
- [ ] 实现切换护甲时的自动刷新（保持配置）
- [ ] 实现数据完整性检查对话框
- [ ] 创建 ConfirmDialog 组件
- [ ] Phase 3: 前端模拟计算功能
- [ ] Phase 3: PD12 特殊处理逻辑

---

## [1.1.0] - 2025-11-11

### 🎉 重大改进：代码规范化

#### 新增 (Added)
- 📝 添加完整的项目文档 `README.md`，包含详细的安装、使用和API说明
- 📝 添加代码改进总结文档 `CODE_IMPROVEMENTS.md`
- 🔧 添加 `.gitignore` 文件，保护敏感信息和构建产物
- 🔧 添加 `backend/.env.example` 环境变量配置模板
- 📏 添加前端 ESLint 配置 (`frontend/.eslintrc.json`)
- 📏 添加后端 ESLint 配置 (`backend/.eslintrc.json`)
- 🎨 添加 Prettier 代码格式化配置 (`frontend/.prettierrc.json`)
- 🛡️ 添加全局错误处理中间件 (`backend/middleware/errorHandler.js`)
- 📦 添加便捷的 npm scripts（lint、format、dev等）

#### 改进 (Changed)
- 🔄 重构后端路由错误处理，使用 `asyncHandler` 包装器统一处理异步错误
- 🔄 优化 `backend/index.js`，集成全局错误处理中间件
- 📦 更新 `backend/package.json`：
  - 添加项目描述和关键词
  - 添加 `dev`、`lint`、`lint:fix` 脚本
  - 移除错误的依赖项（recharts、react-scripts）
- 📦 更新 `frontend/package.json`：
  - 添加项目描述
  - 添加 `lint`、`lint:fix`、`format` 脚本
  - 添加开发依赖（eslint、prettier等）

#### 修复 (Fixed)
- ✅ 修复所有后端路由的重复 try-catch 代码
- ✅ 修复 `package.json` 中的依赖项混乱问题

#### 安全 (Security)
- 🔐 **[重要]** 从 Git 仓库中移除包含敏感信息的 `.env` 文件
- 🔐 添加 `.gitignore` 防止未来误提交敏感文件
- 🔐 创建 `.env.example` 作为配置模板

#### 技术债务 (Technical Debt)
- 🧹 统一代码风格和格式
- 🧹 移除冗余的错误处理代码
- 🧹 改进错误日志记录格式

---

## [1.0.0] - 2025-11-11

### 初始版本

#### 新增 (Added)
- ✨ 实现数据查询页面（TTK对比分析）
- ✨ 实现伤害模拟器页面（交互式假人）
- ✨ 实现完整的武器配件系统
- ✨ 实现精确的伤害计算引擎
- ✨ 实现护甲穿透和耐久度计算
- ✨ 实现TTK曲线图表可视化
- 🗄️ 搭建后端API服务（Express + MySQL）
- 🎨 完成所有前端UI组件和交互逻辑
- 📊 集成 Recharts 图表库
- 🔧 配置前后端开发环境

#### 功能特性
- 多武器TTK对比
- 枪口初速影响计算
- 扳机延迟影响计算
- 实时伤害模拟
- 命中日志记录
- 护甲配置系统
- 武器配件效果叠加

---

## 版本说明

- **[Major]** - 不兼容的API修改
- **[Minor]** - 向下兼容的功能性新增
- **[Patch]** - 向下兼容的问题修正

## 图例

- 🎉 重大更新
- ✨ 新功能
- 🔄 改进/重构
- 🐛 Bug修复
- 🔐 安全更新
- 📝 文档
- 🔧 配置
- 📏 代码规范
- 🎨 样式/UI
- 🗄️ 数据库
- 📦 依赖更新
- 🧹 代码清理
