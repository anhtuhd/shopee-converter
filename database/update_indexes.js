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

async function checkAndCreateIndex(connection, tableName, indexName, columnsSql) {
  try {
    // MySQL SHOW INDEX check
    const [rows] = await connection.execute(
      `SHOW INDEX FROM ${tableName} WHERE Key_name = ?`,
      [indexName]
    );

    if (rows.length === 0) {
      console.log(`Đang tạo chỉ mục ${indexName} trên bảng ${tableName}...`);
      await connection.execute(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
      console.log(`✔ Chỉ mục ${indexName} đã được tạo thành công.`);
    } else {
      console.log(`✔ Chỉ mục ${indexName} đã tồn tại trên bảng ${tableName}.`);
    }
  } catch (err) {
    console.error(`✘ Lỗi khi xử lý chỉ mục ${indexName}:`, err.message);
  }
}

async function migrate() {
  console.log('=== KHỞI CHẠY CẬP NHẬT CHỈ MỤC TỐI ƯU HIỆU NĂNG ===');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối cơ sở dữ liệu thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  try {
    // 1. Chỉ mục idx_orders_sub_id1 trên bảng orders(sub_id1)
    await checkAndCreateIndex(connection, 'orders', 'idx_orders_sub_id1', 'sub_id1');

    // 2. Chỉ mục idx_orders_referrer_id trên bảng orders(referrer_id)
    await checkAndCreateIndex(connection, 'orders', 'idx_orders_referrer_id', 'referrer_id');

    // 3. Chỉ mục idx_orders_status_completed trên bảng orders(status, completed_time)
    await checkAndCreateIndex(connection, 'orders', 'idx_orders_status_completed', 'status, completed_time');

    // 4. Chỉ mục idx_bonuses_user_dates trên bảng special_bonuses(user_id, start_date, end_date)
    await checkAndCreateIndex(connection, 'special_bonuses', 'idx_bonuses_user_dates', 'user_id, start_date, end_date');

    console.log('\n=== CẬP NHẬT CHỈ MỤC CSDL HOÀN TẤT THÀNH CÔNG! ===');
  } catch (err) {
    console.error('✘ LỖI TRONG QUÁ TRÌNH THỰC THI:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();
