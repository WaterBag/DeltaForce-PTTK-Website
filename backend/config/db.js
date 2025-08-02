const mysql = require('mysql2');
require('dotenv').config();

const pool=mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

const promisePool = pool.promise();

async function testConnection() {
    try{
        const [rows] = await promisePool.query('SELECT 1 + 1 AS solution');

        console.log(`数据库连接成功:1+1=${rows[0].solution}`);
    } catch (err){
        console.error('数据库连接失败:',err);
    }
}

testConnection();

module.exports = promisePool;