import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'defaultdb',
      port: parseInt(process.env.DB_PORT || '3306'),
      // Tối ưu tài nguyên Shared Hosting
      waitForConnections: true,
      connectionLimit: 3,       // Tối đa 3 kết nối song song
      maxIdle: 1,               // Giữ tối đa 1 kết nối rỗi trong pool
      idleTimeout: 30000,       // Đóng kết nối rỗi sau 30 giây
      queueLimit: 10,           // Tối đa 10 yêu cầu chờ trong hàng đợi
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      connectTimeout: 10000,    // Timeout kết nối sau 10 giây thay vì chờ vô hạn
    });
  }
  return pool;
}

// Alias để backward-compatible với code cũ dùng getConnection()
export const getConnection = getPool;
