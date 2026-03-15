/**
 * 数据库连接配置模块
 * 负责创建和管理MySQL数据库连接池
 */

const mysql = require('mysql2');
require('dotenv').config({ override: true });

// pool: MySQL 连接池（回调版），由 mysql2 创建
const pool = mysql.createPool({
    host: process.env.DB_HOST,           // 数据库主机地址
    user: process.env.DB_USER,           // 数据库用户名
    password: process.env.DB_PASSWORD,   // 数据库密码
    database: process.env.DB_DATABASE,   // 数据库名称
    waitForConnections: true,            // 当连接池满时等待可用连接
    connectionLimit: 10,                 // 最大连接数限制
    queueLimit: 0                        // 无限制的排队请求
});

// promisePool: Promise 版连接池（支持 async/await）
const promisePool = pool.promise();

/**
 * 测试数据库连接是否成功
 * 执行简单的SQL查询来验证连接状态
 */
async function testConnection() {
    try {
        // rows: 测试查询返回行
        const [rows] = await promisePool.query('SELECT 1 + 1 AS solution');
        console.log(`✅ 数据库连接成功: 1 + 1 = ${rows[0].solution}`);
    } catch (err) {
        console.error('❌ 数据库连接失败:', err);
    }
}

// 启动时测试数据库连接
testConnection();

// 导出Promise版本的连接池供其他模块使用
module.exports = promisePool;
