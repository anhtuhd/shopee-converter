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
  console.log('=== KHỞI CHẠY MIGRATION THÊM CỘT MARQUEE_TEXT VÀO BẢNG SPECIAL_BONUSES ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM special_bonuses LIKE "marquee_text"');
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE special_bonuses ADD COLUMN marquee_text VARCHAR(255) DEFAULT NULL AFTER description');
      console.log('✔ Đã bổ sung cột marquee_text vào bảng special_bonuses.');
    } else {
      console.log('✔ Cột marquee_text đã tồn tại trong bảng special_bonuses.');
    }

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
