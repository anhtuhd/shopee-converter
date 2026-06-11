const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Tự động tải .env.local nếu tồn tại để chạy trên local
const envLocalPath = path.join(__dirname, '../.env.local');
const envPath = path.join(__dirname, '../.env');

function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const envContent = fs.readFileSync(filePath, 'utf8');
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
}

loadEnv(envPath);
loadEnv(envLocalPath);

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function migrate() {
  console.log('=== KHỞI CHẠY MIGRATION BẢNG APP_FINANCIALS ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    console.log('--- Tạo bảng app_financials ---');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS app_financials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('revenue', 'expense') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        transaction_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.execute(createTableQuery);
    console.log('✔ Đã khởi tạo bảng app_financials thành công.');

    // Thêm index để tối ưu truy vấn theo ngày và loại giao dịch
    console.log('--- Bổ sung chỉ mục ---');
    try {
      await connection.execute('CREATE INDEX idx_financials_date ON app_financials(transaction_date);');
      await connection.execute('CREATE INDEX idx_financials_type ON app_financials(type);');
      console.log('✔ Đã bổ sung các chỉ mục cho bảng app_financials.');
    } catch (indexErr) {
      console.log('ℹ Ghi chú: Chỉ mục đã tồn tại hoặc không cần thiết:', indexErr.message);
    }

    // Thêm một số dữ liệu mẫu (máy chủ, tên miền) nếu bảng trống
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM app_financials');
    if (rows[0].count === 0) {
      console.log('--- Chèn dữ liệu mẫu cho thu chi ngoài hệ thống ---');
      const insertDemoQuery = `
        INSERT INTO app_financials (type, amount, category, description, transaction_date) VALUES
        ('expense', 350000.00, 'Server', 'Chi phí VPS Cloud hàng tháng', CURDATE() - INTERVAL 10 DAY),
        ('expense', 280000.00, 'Domain', 'Gia hạn tên miền pishare.site', CURDATE() - INTERVAL 8 DAY),
        ('expense', 500000.00, 'Quảng cáo', 'Chạy quảng cáo Facebook Ads tháng này', CURDATE() - INTERVAL 3 DAY),
        ('revenue', 1200000.00, 'Khác', 'Thu tài trợ/Donate từ đối tác quảng cáo', CURDATE() - INTERVAL 5 DAY);
      `;
      await connection.execute(insertDemoQuery);
      console.log('✔ Đã chèn dữ liệu thu chi ngoài mẫu thành công.');
    }

    console.log('\n=== MIGRATION APP_FINANCIALS HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH MIGRATION:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
