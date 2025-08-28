/**
 * API基础URL配置
 * 定义后端API服务器的地址和端口
 * 开发环境默认使用localhost:3001
 * 生产环境使用相对路径
 */
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // 生产环境使用相对路径
  : "http://localhost:3001";  // 开发环境使用localhost
