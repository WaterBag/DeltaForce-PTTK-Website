
/**
 * 后端服务器主入口文件
 * 负责初始化Express应用、配置中间件和路由
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ttkRoutes = require('./routes/ttk');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// app: Express 应用实例（挂载中间件、路由、静态资源）
const app = express();

// port: 后端监听端口
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

// 注册TTK相关API路由（必须在静态文件之前）
app.use('/api/ttk', ttkRoutes);

// 提供前端静态文件服务（生产环境）
// 设置静态资源缓存策略以提升加载速度
// frontendBuildPath: React 前端构建产物目录（生产环境静态资源入口）
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath, {
  maxAge: '1d',          // 静态资源缓存1天
  etag: true,            // 启用ETag
  lastModified: true,    // 启用Last-Modified
  setHeaders: (res, filePath) => {
    // 对 index.html 禁用强缓存，确保每次加载都能拿到最新的资源清单
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
      return;
    }
    // 对图片文件设置更长的缓存时间
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30天
    }
    // 对 JS 和 CSS 文件设置中等缓存时间
    if (filePath.match(/\.(js|css)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天
    }
  }
}));

// 所有其他非API请求返回 index.html（支持前端路由）
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ==================== 错误处理中间件 ====================
// 注意：错误处理中间件必须放在所有路由之后

// 404错误处理 - 捕获所有未匹配的路由
app.use(notFoundHandler);

// 全局错误处理 - 统一处理所有错误
app.use(globalErrorHandler);

// 启动服务器监听指定端口
app.listen(port, () => {
  console.log(`✅ 后端服务已启动: http://localhost:${port}`);
  console.log(`📁 静态文件路径: ${frontendBuildPath}`);
  console.log(`🌐 访问地址: http://localhost:${port}`);
});
