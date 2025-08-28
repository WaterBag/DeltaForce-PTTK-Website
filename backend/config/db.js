/**
 * 数据库连接配置模块
 * 负责创建和管理MySQL数据库连接池
 */

const mysql = require('mysql2');
require('dotenv').config();

// 创建MySQL连接池配置
const pool = mysql.createPool({
    host: process.env.DB_HOST,           // 数据库主机地址
    user: process.env.DB_USER,           // 数据库用户名
    password: process.env.DB_PASSWORD,   // 数据库密码
    database: process.env.DB_DATABASE,   // 数据库名称
    waitForConnections: true,            // 当连接池满时等待可用连接
    connectionLimit: 10,                 // 最大连接数限制
    queueLimit: 0                        // 无限制的排队请求
});

// 将连接池转换为Promise版本以便使用async/await
const promisePool = pool.promise();

/**
 * 测试数据库连接是否成功
 * 执行简单的SQL查询来验证连接状态
 */
async function testConnection() {
    try {
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
