# 更新日志 (Changelog)

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
