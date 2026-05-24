const mysql = require('mysql2/promise');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Tự động tải .env.local nếu tồn tại để chạy trên local
const envLocalPath = path.join(__dirname, '.env.local');
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

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';

// Generate admin auth token for API calls
const adminToken = jwt.sign({ userId: 1, role: 'admin' }, JWT_SECRET);

// Helper function to send multipart/form-data with CSV payload
function uploadCsvRequest(csvContent) {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Math.random().toString(16);
    
    let postData = '';
    postData += '--' + boundary + '\r\n';
    postData += 'Content-Disposition: form-data; name="csv_file"; filename="orders.csv"\r\n';
    postData += 'Content-Type: text/csv\r\n\r\n';
    postData += csvContent + '\r\n';
    postData += '--' + boundary + '--\r\n';

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/csv',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': 'auth_token=' + adminToken
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TÍNH NĂNG THƯỞNG HOÀN TIỀN ĐẶC BIỆT ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL local. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    // 1. Tạo user test nếu chưa có
    console.log('\n--- Bước 1: Chuẩn bị tài khoản test ---');
    const username = 'testbonususer';
    const email = 'testbonususer@pishare.site';
    const passwordHash = '$2a$10$U262NCS.WbZgqP/K1Zp5cOK0Xf012LzK0fL6zR8KjXN6T.11dcdb7'; // '123456'
    
    const [userRows] = await connection.execute('SELECT id FROM users WHERE username = ?', [username]);
    let userId;
    if (userRows.length === 0) {
      const [res] = await connection.execute(
        'INSERT INTO users (username, email, password_hash, commission_rate) VALUES (?, ?, ?, 0.50)',
        [username, email, passwordHash]
      );
      userId = res.insertId;
      console.log(`✔ Đã tạo mới user test ${username} (ID: ${userId}) với hoa hồng mặc định 50%`);
    } else {
      userId = userRows[0].id;
      // Reset commission rate to 50%
      await connection.execute('UPDATE users SET commission_rate = 0.50 WHERE id = ?', [userId]);
      console.log(`✔ User test ${username} đã tồn tại (ID: ${userId}). Đã reset tỷ lệ mặc định về 50%`);
    }

    // 2. Dọn dẹp các mốc khuyến mại cũ và đơn hàng cũ của test user
    console.log('\n--- Bước 2: Dọn dẹp mốc khuyến mại & đơn hàng cũ ---');
    await connection.execute('DELETE FROM special_bonuses WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM orders WHERE sub_id1 = ?', [username]);
    console.log('✔ Đã dọn dẹp sạch sẽ dữ liệu cũ.');

    // 3. Tạo chương trình thưởng đặc biệt 75% cho khoảng thời gian 2026-06-01 đến 2026-06-07
    console.log('\n--- Bước 3: Tạo mốc thưởng đặc biệt (75% từ 2026-06-01 đến 2026-06-07) ---');
    const bonusRate = 0.75;
    const startDate = '2026-06-01 00:00:00';
    const endDate = '2026-06-07 23:59:59';
    await connection.execute(
      'INSERT INTO special_bonuses (user_id, bonus_rate, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)',
      [userId, bonusRate, startDate, endDate, 'Đợt thưởng hè đặc biệt']
    );
    console.log('✔ Đã lưu mốc thưởng đặc biệt vào cơ sở dữ liệu.');

    // 4. Giả lập upload file CSV chứa 2 đơn hàng:
    // Đơn 1: Ngày 2026-06-03 12:00:00 (Nằm trong khoảng thưởng 75%)
    // Đơn 2: Ngày 2026-06-10 12:00:00 (Ngoài khoảng thưởng, hưởng 50%)
    console.log('\n--- Bước 4: Giả lập import CSV đơn hàng ---');
    const csvContent = 
      'ID đơn hàng,Trạng thái đặt hàng,Thời Gian Đặt Hàng,Tổng hoa hồng sản phẩm(₫),Sub_id1,Item id,ID Model\n' +
      'ORDER101,Hoàn thành,2026-06-03 12:00:00,100000,testbonususer,ITEM001,MODEL001\n' +
      'ORDER102,Hoàn thành,2026-06-10 12:00:00,100000,testbonususer,ITEM002,MODEL002';

    const uploadRes = await uploadCsvRequest(csvContent);
    console.log('API Import Response:', uploadRes.statusCode, uploadRes.body);

    if (uploadRes.statusCode !== 200) {
      throw new Error('Import CSV thất bại.');
    }

    // 5. Kiểm tra kết quả tính hoa hồng user_commission trong CSDL
    console.log('\n--- Bước 5: Xác minh user_commission tính toán trong DB ---');
    const [orderRows] = await connection.execute(
      'SELECT order_id, total_commission, user_commission FROM orders WHERE sub_id1 = ? ORDER BY order_id ASC',
      [username]
    );

    if (orderRows.length !== 2) {
      throw new Error(`Kỳ vọng có 2 đơn hàng được import, thực tế nhận được: ${orderRows.length}`);
    }

    console.log('Đơn hàng 1 (Trong mốc khuyến mại):', orderRows[0]);
    console.log('Đơn hàng 2 (Ngoài mốc khuyến mại):', orderRows[1]);

    // Đơn 1: 100,000 * 75% = 75,000
    if (parseFloat(orderRows[0].user_commission) === 75000) {
      console.log('✔ Đơn hàng 1 tính hoa hồng 75% chính xác! (75.000 đ)');
    } else {
      throw new Error(`Đơn hàng 1 tính sai hoa hồng. Kỳ vọng 75000, thực tế nhận: ${orderRows[0].user_commission}`);
    }

    // Đơn 2: 100,000 * 50% = 50,000
    if (parseFloat(orderRows[1].user_commission) === 50000) {
      console.log('✔ Đơn hàng 2 tính hoa hồng 50% chính xác! (50.000 đ)');
    } else {
      throw new Error(`Đơn hàng 2 tính sai hoa hồng. Kỳ vọng 50000, thực tế nhận: ${orderRows[1].user_commission}`);
    }

    console.log('\n=== TẤT CẢ CÁC BÀI XÁC MINH THƯỞNG ĐẶC BIỆT ĐÃ THÀNH CÔNG! ===\n');

  } catch (err) {
    console.error('\n✘ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runTests();
