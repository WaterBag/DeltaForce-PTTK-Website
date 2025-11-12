# 更新日志 (Changelog)

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
