
/**
 * 后端服务器主入口文件
 * 负责初始化Express应用、配置中间件和路由
 */

const express = require('express');
const cors = require('cors');
const ttkRoutes = require('./routes/ttk');

// 创建Express应用实例
const app = express();

// 服务器端口配置
const port = 3001;

// 启用CORS跨域支持
app.use(cors());

// 请求日志中间件 - 记录所有传入请求的方法和路径
app.use((req, res, next) => {
  console.log(`请求方法: ${req.method}，请求路径: ${req.path}`);
  next();
});

// 解析JSON请求体
app.use(express.json());

// 注册TTK相关API路由
app.use('/api/ttk', ttkRoutes);

// 启动服务器监听指定端口
app.listen(port, () => {
  console.log(`✅ 后端服务已启动: http://localhost:${port}`);
});
