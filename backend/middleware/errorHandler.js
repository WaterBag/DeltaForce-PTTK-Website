/**
 * 全局错误处理中间件
 * 统一捕获和处理应用中的所有错误
 */

/**
 * 404错误处理器 - 捕获未找到的路由
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`未找到路由 - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * 全局错误处理器 - 统一错误响应格式
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const globalErrorHandler = (err, req, res, next) => {
  // 设置HTTP状态码
  const statusCode = err.status || err.statusCode || 500;
  
  // 记录错误日志
  console.error('❌ 错误发生:', {
    message: err.message,
    status: statusCode,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // 统一的错误响应格式
  res.status(statusCode).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: {
      status: statusCode,
      path: req.path,
      timestamp: new Date().toISOString(),
      // 开发环境下返回详细的错误堆栈信息
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * 异步路由错误包装器 - 自动捕获异步路由中的错误
 * @param {Function} fn - 异步路由处理函数
 * @returns {Function} 包装后的路由处理函数
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  notFoundHandler,
  globalErrorHandler,
  asyncHandler
};
