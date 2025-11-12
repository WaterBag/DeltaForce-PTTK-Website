# 更新日志 (Changelog)

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
