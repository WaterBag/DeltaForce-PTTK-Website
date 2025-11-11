# 🎮 三角洲行动 PTTK 网站

> Delta Force - Personal Time To Kill Calculator & Damage Simulator
> 
> 三角洲行动游戏的武器伤害计算器和模拟器

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)

## 📖 项目简介

这是一个为《三角洲行动》游戏玩家打造的专业级武器数据分析工具，提供：

- **📊 数据查询页面**：多武器TTK（击杀时间）对比分析
- **🎯 伤害模拟器**：交互式假人，实时模拟命中效果
- **🔧 配件系统**：完整的武器配件效果计算
- **🛡️ 护甲系统**：精确的护甲穿透和伤害减免计算

## ✨ 核心功能

### 1. 数据查询模式
- ✅ 根据护甲配置自动查询可用武器
- ✅ 多武器TTK曲线对比（支持同时对比多个配置）
- ✅ 枪口初速影响计算（子弹飞行时间）
- ✅ 扳机延迟影响计算
- ✅ 完整的武器配件效果模拟

### 2. 伤害模拟器
- ✅ 交互式假人模型（点击不同部位）
- ✅ 实时伤害计算（穿透、钝伤、混合伤害）
- ✅ 护甲耐久度实时跟踪
- ✅ 详细的命中日志记录
- ✅ BTK/TTK 统计分析

## 🚀 快速开始

### 环境要求

- **Node.js**: 16.x 或更高版本
- **MySQL**: 8.0 或更高版本
- **npm**: 7.x 或更高版本

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/WaterBag/DeltaForce-PTTK-Website.git
cd DeltaForce-PTTK-Website
```

#### 2. 配置后端

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的数据库配置信息
```

**`.env` 文件配置示例：**
```env
DB_HOST=localhost
DB_DATABASE=ballistics_db
DB_USER=your_username
DB_PASSWORD=your_password
PORT=3306
```

#### 3. 配置前端

```bash
# 返回项目根目录
cd ..

# 进入前端目录
cd frontend

# 安装依赖
npm install
```

#### 4. 数据库设置

确保您的 MySQL 数据库中存在以下表结构：

```sql
CREATE DATABASE ballistics_db;

USE ballistics_db;

CREATE TABLE btk_list_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gun_name VARCHAR(100),
    bullet_name VARCHAR(100),
    helmet_protection_grade INT,
    armor_protection_grade INT,
    helmet_durability INT,
    armor_durability INT,
    protects_chest BOOLEAN,
    protects_abdominal BOOLEAN,
    protects_upper_arm BOOLEAN,
    distance INT,
    btk_data JSON
);
```

### 运行项目

#### 开发模式

**终端 1 - 启动后端服务：**
```bash
cd backend
npm run dev
```

**终端 2 - 启动前端开发服务器：**
```bash
cd frontend
npm start
```

访问：`http://localhost:3000`

#### 生产模式

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 启动后端（自动提供前端静态文件）
cd ../backend
npm start
```

访问：`http://localhost:3001`

## 📁 项目结构

```
DeltaForce-PTTK-Website/
├── backend/                    # 后端服务
│   ├── config/                # 配置文件
│   │   └── db.js             # 数据库连接配置
│   ├── middleware/            # 中间件
│   │   └── errorHandler.js   # 错误处理中间件
│   ├── routes/                # API路由
│   │   └── ttk.js            # TTK相关API
│   ├── .env.example          # 环境变量模板
│   ├── .eslintrc.json        # ESLint配置
│   ├── index.js              # 入口文件
│   └── package.json          # 依赖配置
│
├── frontend/                  # 前端应用
│   ├── public/               # 公共资源
│   ├── src/
│   │   ├── api/             # API调用封装
│   │   │   ├── config.js    # API配置
│   │   │   └── ttkAPI.js    # TTK API
│   │   ├── assets/          # 静态资源
│   │   │   ├── data/        # 游戏数据
│   │   │   │   ├── weapons.js      # 武器数据
│   │   │   │   ├── ammos.js        # 弹药数据
│   │   │   │   ├── armors.js       # 护甲数据
│   │   │   │   ├── helmets.js      # 头盔数据
│   │   │   │   └── modifications.js # 配件数据
│   │   │   └── images/      # 图片资源
│   │   ├── components/      # React组件
│   │   │   ├── data_query/  # 数据查询页组件
│   │   │   ├── simulator/   # 模拟器页组件
│   │   │   ├── layout/      # 布局组件
│   │   │   └── public/      # 公共组件
│   │   ├── config/          # 前端配置
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── pages/           # 页面组件
│   │   │   ├── DataQuery.js    # 数据查询页
│   │   │   └── Simulator.js    # 模拟器页
│   │   ├── utils/           # 工具函数
│   │   │   ├── dataProcessor.js    # TTK数据处理
│   │   │   ├── simulationUtils.js  # 伤害计算引擎
│   │   │   └── ...
│   │   ├── App.js           # 主应用组件
│   │   └── index.js         # 入口文件
│   ├── .eslintrc.json       # ESLint配置
│   ├── .prettierrc.json     # Prettier配置
│   └── package.json         # 依赖配置
│
├── .gitignore               # Git忽略文件
└── README.md               # 项目文档
```

## 🛠️ 技术栈

### 后端
- **框架**: Express.js 5.1.0
- **数据库**: MySQL 8.0
- **数据库驱动**: mysql2 (Promise Pool)
- **中间件**: 
  - cors (跨域支持)
  - express.json (JSON解析)
  - 自定义错误处理中间件

### 前端
- **框架**: React 18.2.0
- **路由**: React Router 7.8.1
- **图表**: Recharts 3.1.0
- **状态管理**: React Hooks (useState, useEffect, useMemo)
- **样式**: CSS Modules

## 🔧 开发指南

### 代码规范

项目已配置 ESLint 和 Prettier：

```bash
# 前端代码检查
cd frontend
npm run lint

# 后端代码检查
cd backend
npm run lint
```

### 常用命令

```bash
# 前端
npm start          # 启动开发服务器
npm run build      # 构建生产版本
npm test          # 运行测试

# 后端
npm start          # 启动生产服务器
npm run dev        # 启动开发服务器（如已配置nodemon）
```

## 🔐 安全注意事项

⚠️ **重要安全提醒**：

1. **永远不要**将 `.env` 文件提交到 Git 仓库
2. 使用强密码保护数据库
3. 在生产环境中启用 HTTPS
4. 定期更新依赖包以修复安全漏洞

```bash
# 检查依赖安全性
npm audit

# 自动修复安全漏洞
npm audit fix
```

## 📊 API 接口文档

### 1. 查询可用枪械
```
POST /api/ttk/available-guns
Content-Type: application/json

{
  "helmetLevel": 5,
  "armorLevel": 5,
  "helmetDurability": 40,
  "armorDurability": 65,
  "chestProtection": 1,
  "stomachProtection": 1,
  "armProtection": 1
}
```

### 2. 查询枪械详情
```
POST /api/ttk/gun-details
Content-Type: application/json

{
  "gunName": "M4A1",
  "helmetLevel": 5,
  "armorLevel": 5,
  ...
}
```

详细 API 文档请参考 `backend/routes/ttk.js`

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 待办事项

- [ ] 添加用户账号系统
- [ ] 支持配装方案保存
- [ ] 添加更多武器数据
- [ ] 移动端适配优化
- [ ] 添加英文语言支持

## 📜 许可证

本项目仅供学习交流使用。

## 👨‍💻 作者

**WaterBag**

- GitHub: [@WaterBag](https://github.com/WaterBag)

## 🙏 致谢

- 感谢《三角洲行动》游戏提供的灵感
- 感谢所有贡献者和使用者的支持

---

⭐ 如果这个项目对您有帮助，请给个 Star！
