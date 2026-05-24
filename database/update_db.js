const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Tự động tải .env.local nếu tồn tại để chạy trên local
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function migrate() {
  console.log('=== KHỞI CHẠY MIGRATION CƠ SỞ DỮ LIỆU ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    // 1. Thêm cột custom_affiliate_id vào bảng users
    console.log('--- Bước 1: Kiểm tra và bổ sung cột custom_affiliate_id ---');
    const [columns] = await connection.execute('SHOW COLUMNS FROM users LIKE "custom_affiliate_id"');
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN custom_affiliate_id VARCHAR(50) DEFAULT NULL AFTER commission_rate');
      console.log('✔ Đã bổ sung cột custom_affiliate_id vào bảng users.');
    } else {
      console.log('✔ Cột custom_affiliate_id đã tồn tại.');
    }

    // 2. Tạo bảng special_bonuses
    console.log('--- Bước 2: Tạo bảng special_bonuses ---');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS special_bonuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bonus_rate DECIMAL(5,2) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createTableQuery);
    console.log('✔ Đã khởi tạo bảng special_bonuses thành công.');

    console.log('\n=== MIGRATION HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH MIGRATION:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
