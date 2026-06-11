const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function runSeed() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    console.log('Seeding test user data...');
    
    // Update testuser7 to have a bank QR code (using a static QR code image generator)
    const testQrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PiShareTestuser7BankQR';
    await connection.execute(`
      UPDATE users 
      SET bank_qr = ?, full_name = 'Người dùng thử nghiệm 7', phone = '0987654321' 
      WHERE username = 'testuser7'
    `, [testQrUrl]);
    console.log('✔ Updated testuser7 with bank_qr.');

    // Delete existing test orders for clean seed
    await connection.execute(`
      DELETE FROM orders WHERE order_id IN ('ORD_SEED_001', 'ORD_SEED_002')
    `);

    // Insert completed orders for testuser7 so they have a positive pending payout
    await connection.execute(`
      INSERT INTO orders (order_id, status, order_time, completed_time, click_time, total_commission, user_commission, sub_id1)
      VALUES 
      ('ORD_SEED_001', 'Hoàn thành', '2026-06-10 10:00:00', '2026-06-10 12:00:00', '2026-06-10 09:30:00', 50000.00, 25000.00, 'testuser7'),
      ('ORD_SEED_002', 'Hoàn thành', '2026-06-10 14:00:00', '2026-06-10 16:00:00', '2026-06-10 13:30:00', 80000.00, 40000.00, 'testuser7')
    `);
    console.log('✔ Inserted 2 completed orders for testuser7.');

    console.log('\n========================================================');
    console.log('Gieo dữ liệu thành công!');
    console.log('Sếp hãy mở trang admin, chọn tab "Tổng hợp thanh toán",');
    console.log('chọn ngày chốt là 2026-06-11 và kiểm tra user "testuser7".');
    console.log('========================================================');
    
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await connection.end();
  }
}

runSeed();
