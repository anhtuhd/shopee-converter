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
  console.log('=== KHỞI CHẠY MIGRATION EMAIL VERIFICATION ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    // 1. Thêm cột is_verified vào bảng users
    console.log('--- Bước 1: Kiểm tra và bổ sung cột is_verified vào bảng users ---');
    const [verifiedCols] = await connection.execute('SHOW COLUMNS FROM users LIKE "is_verified"');
    if (verifiedCols.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0 AFTER role');
      console.log('✔ Đã bổ sung cột is_verified vào bảng users.');
    } else {
      console.log('✔ Cột is_verified đã tồn tại trong bảng users.');
    }

    // 2. Thêm cột verification_token vào bảng users
    console.log('--- Bước 2: Kiểm tra và bổ sung cột verification_token vào bảng users ---');
    const [tokenCols] = await connection.execute('SHOW COLUMNS FROM users LIKE "verification_token"');
    if (tokenCols.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) DEFAULT NULL AFTER is_verified');
      console.log('✔ Đã bổ sung cột verification_token vào bảng users.');
    } else {
      console.log('✔ Cột verification_token đã tồn tại trong bảng users.');
    }

    // 3. Thêm cột verification_token_expiry vào bảng users
    console.log('--- Bước 3: Kiểm tra và bổ sung cột verification_token_expiry vào bảng users ---');
    const [expiryCols] = await connection.execute('SHOW COLUMNS FROM users LIKE "verification_token_expiry"');
    if (expiryCols.length === 0) {
      await connection.execute('ALTER TABLE users ADD COLUMN verification_token_expiry DATETIME DEFAULT NULL AFTER verification_token');
      console.log('✔ Đã bổ sung cột verification_token_expiry vào bảng users.');
    } else {
      console.log('✔ Cột verification_token_expiry đã tồn tại trong bảng users.');
    }

    // 4. Kích hoạt toàn bộ người dùng cũ hiện có (tránh làm gián đoạn tài khoản đang chạy)
    console.log('--- Bước 4: Tự động kích hoạt (Verify) cho tất cả tài khoản cũ ---');
    const [updateResult] = await connection.execute('UPDATE users SET is_verified = 1 WHERE is_verified = 0 OR is_verified IS NULL');
    console.log(`✔ Đã cập nhật kích hoạt thành công cho ${updateResult.affectedRows} tài khoản cũ.`);

    console.log('\n=== MIGRATION EMAIL VERIFICATION HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH MIGRATION:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
