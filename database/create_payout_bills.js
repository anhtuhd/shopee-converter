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
  console.log('=== KHỞI CHẠY MIGRATION BẢNG PAYOUT_BILLS ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    console.log('--- Tạo bảng payout_bills ---');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payout_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(50) NOT NULL,
        cutoff_date DATETIME NOT NULL,
        order_count INT NOT NULL DEFAULT 0,
        personal_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
        referral_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_payout DECIMAL(15,2) NOT NULL DEFAULT 0,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'Đã thanh toán',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createTableQuery);
    console.log('✔ Đã khởi tạo bảng payout_bills thành công.');

    // Bổ sung chỉ mục tối ưu hiệu năng
    console.log('--- Bổ sung chỉ mục ---');
    try {
      await connection.execute('CREATE INDEX idx_payout_bills_username ON payout_bills(username);');
      await connection.execute('CREATE INDEX idx_payout_bills_user_id ON payout_bills(user_id);');
      console.log('✔ Đã bổ sung các chỉ mục cho bảng payout_bills.');
    } catch (indexErr) {
      console.log('⚠ Ghi chú: Chỉ mục đã tồn tại hoặc không cần thiết:', indexErr.message);
    }

    console.log('\n=== MIGRATION PAYOUT_BILLS HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH MIGRATION:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
