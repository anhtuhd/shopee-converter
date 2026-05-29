const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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
  console.log('=== KHỞI CHẠY MIGRATION THÊM CỘT SHOW_FOR_GUESTS VÀO BẢNG SPECIAL_BONUSES ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    const [columns] = await connection.execute('SHOW COLUMNS FROM special_bonuses LIKE "show_for_guests"');
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE special_bonuses ADD COLUMN show_for_guests TINYINT DEFAULT 0 AFTER marquee_text');
      console.log('✔ Đã bổ sung cột show_for_guests vào bảng special_bonuses.');
    } else {
      console.log('✔ Cột show_for_guests đã tồn tại trong bảng special_bonuses.');
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
