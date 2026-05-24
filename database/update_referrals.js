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
  console.log('=== KHỞI CHẠY MIGRATION REFERRAL SYSTEM ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    // 1. Tạo bảng referrals
    console.log('--- Bước 1: Tạo bảng referrals ---');
    const createReferralsQuery = `
      CREATE TABLE IF NOT EXISTS referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrer_id INT NOT NULL,
        referred_id INT NOT NULL UNIQUE,
        first_order_completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createReferralsQuery);
    console.log('✔ Bảng referrals đã được tạo thành công.');

    // 2. Thêm cột referrer_id vào bảng orders
    console.log('--- Bước 2: Kiểm tra và bổ sung cột referrer_id vào bảng orders ---');
    const [refIdCols] = await connection.execute('SHOW COLUMNS FROM orders LIKE "referrer_id"');
    if (refIdCols.length === 0) {
      await connection.execute('ALTER TABLE orders ADD COLUMN referrer_id INT DEFAULT NULL AFTER user_commission');
      console.log('✔ Đã bổ sung cột referrer_id vào bảng orders.');
    } else {
      console.log('✔ Cột referrer_id đã tồn tại trong bảng orders.');
    }

    // 3. Thêm cột referrer_commission vào bảng orders
    console.log('--- Bước 3: Kiểm tra và bổ sung cột referrer_commission vào bảng orders ---');
    const [refCommCols] = await connection.execute('SHOW COLUMNS FROM orders LIKE "referrer_commission"');
    if (refCommCols.length === 0) {
      await connection.execute('ALTER TABLE orders ADD COLUMN referrer_commission DECIMAL(15,2) DEFAULT 0.00 AFTER referrer_id');
      console.log('✔ Đã bổ sung cột referrer_commission vào bảng orders.');
    } else {
      console.log('✔ Cột referrer_commission đã tồn tại trong bảng orders.');
    }

    // 4. Thêm cột referrer_payout_status vào bảng orders
    console.log('--- Bước 4: Kiểm tra và bổ sung cột referrer_payout_status vào bảng orders ---');
    const [refStatusCols] = await connection.execute('SHOW COLUMNS FROM orders LIKE "referrer_payout_status"');
    if (refStatusCols.length === 0) {
      await connection.execute("ALTER TABLE orders ADD COLUMN referrer_payout_status VARCHAR(50) DEFAULT 'Chưa thanh toán' AFTER referrer_commission");
      console.log('✔ Đã bổ sung cột referrer_payout_status vào bảng orders.');
    } else {
      console.log('✔ Cột referrer_payout_status đã tồn tại trong bảng orders.');
    }

    console.log('\n=== MIGRATION REFERRAL SYSTEM HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH MIGRATION:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
