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
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TÍNH NĂNG REFERRAL SYSTEM ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL local. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    // 1. Chuẩn bị tài khoản test
    console.log('\n--- Bước 1: Chuẩn bị tài khoản test ---');
    const uA = { username: 'testreferrer', email: 'testreferrer@pishare.site', rate: 0.50 };
    const uB = { username: 'testreferred', email: 'testreferred@pishare.site', rate: 0.50 };
    const passwordHash = '$2a$10$U262NCS.WbZgqP/K1Zp5cOK0Xf012LzK0fL6zR8KjXN6T.11dcdb7'; // '123456'

    // Dọn dẹp tài khoản test cũ
    await connection.execute('DELETE FROM users WHERE username IN (?, ?)', [uA.username, uB.username]);
    
    // Tạo User A (Referrer)
    const [resA] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, commission_rate) VALUES (?, ?, ?, ?)',
      [uA.username, uA.email, passwordHash, uA.rate]
    );
    const idA = resA.insertId;
    console.log(`✔ Đã tạo Người giới thiệu A (testreferrer) - ID: ${idA}`);

    // Tạo User B (Referred)
    const [resB] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, commission_rate) VALUES (?, ?, ?, ?)',
      [uB.username, uB.email, passwordHash, uB.rate]
    );
    const idB = resB.insertId;
    console.log(`✔ Đã tạo Người được giới thiệu B (testreferred) - ID: ${idB}`);

    // Dọn dẹp đơn hàng cũ của hai user test
    await connection.execute('DELETE FROM orders WHERE sub_id1 IN (?, ?)', [uA.username, uB.username]);

    // 2. Thiết lập mối liên kết giới thiệu B được giới thiệu bởi A
    console.log('\n--- Bước 2: Thiết lập mối liên kết giới thiệu (referrals) ---');
    await connection.execute(
      'INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)',
      [idA, idB]
    );
    console.log(`✔ Thiết lập thành công: B (ID: ${idB}) giới thiệu bởi A (ID: ${idA})`);

    // 3. Test Case 1: Giả lập import đơn hàng đầu tiên của B để kích hoạt mốc 30 ngày
    // Ngày hoàn thành đơn của B: 2026-06-01 12:00:00, tổng hoa hồng Shopee: 100.000đ
    console.log('\n--- Bước 3: Test Case 1 - Đơn hàng đầu tiên của B hoàn thành ---');
    const csvB = 
      'ID đơn hàng,Trạng thái đặt hàng,Thời Gian Đặt Hàng,Thời gian hoàn thành,Tổng hoa hồng sản phẩm(₫),Sub_id1,Item id,ID Model\n' +
      'ORDER_B_101,Hoàn thành,2026-06-01 10:00:00,2026-06-01 12:00:00,100000,testreferred,ITEM_B_1,MODEL_B_1';

    const uploadResB = await uploadCsvRequest(csvB);
    console.log('API Import B Response:', uploadResB.statusCode, uploadResB.body);
    
    if (uploadResB.statusCode !== 200) {
      throw new Error('Import đơn hàng của B thất bại.');
    }

    // Kiểm tra DB xem ngày hoàn thành đơn đầu của B đã được ghi nhận chưa
    const [refRows] = await connection.execute('SELECT first_order_completed_at FROM referrals WHERE referred_id = ?', [idB]);
    const firstCompleted = refRows[0]?.first_order_completed_at;
    console.log('first_order_completed_at ghi nhận trong DB:', firstCompleted);
    if (firstCompleted) {
      console.log('✔ Ngày đơn đầu hoàn thành ghi nhận chính xác!');
    } else {
      throw new Error('Ngày hoàn thành đơn đầu của B chưa được ghi nhận vào CSDL.');
    }

    // Kiểm tra hoa hồng giới thiệu referrer_commission (5% của hoa hồng B)
    // Hoa hồng của B = 100.000 * 50% = 50.000 đ
    // Thưởng giới thiệu của A = 50.000 * 5% = 2.500 đ
    const [orderBRows] = await connection.execute(
      'SELECT referrer_id, referrer_commission, referrer_payout_status FROM orders WHERE order_id = ?',
      ['ORDER_B_101']
    );
    const orderB = orderBRows[0];
    console.log('Đơn hàng của B trong DB:', orderB);
    if (parseInt(orderB.referrer_id) === idA && parseFloat(orderB.referrer_commission) === 2500) {
      console.log('✔ Cộng thưởng 5% hoa hồng cấp dưới cho A chính xác! (2.500 đ)');
      console.log(`✔ Cột referrer_payout_status mặc định là: ${orderB.referrer_payout_status}`);
    } else {
      throw new Error('Tính sai thưởng giới thiệu trích từ đơn của B.');
    }

    // 4. Test Case 2: Giả lập đơn hàng cá nhân của A phát sinh trong thời hạn 30 ngày (ngày 2026-06-15)
    // Tỉ lệ hoàn tiền của A phải được tăng thêm 5% (thành 55%).
    // Hoa hồng của A cho đơn này = 100.000 * 55% = 55.000 đ.
    console.log('\n--- Bước 4: Test Case 2 - Đơn hàng cá nhân của A TRONG THỜI HẠN 30 ngày bonus ---');
    const csvA1 = 
      'ID đơn hàng,Trạng thái đặt hàng,Thời Gian Đặt Hàng,Tổng hoa hồng sản phẩm(₫),Sub_id1,Item id,ID Model\n' +
      'ORDER_A_201,Hoàn thành,2026-06-15 12:00:00,100000,testreferrer,ITEM_A_1,MODEL_A_1';

    const uploadResA1 = await uploadCsvRequest(csvA1);
    console.log('API Import A1 Response:', uploadResA1.statusCode, uploadResA1.body);

    const [orderA1Rows] = await connection.execute(
      'SELECT user_commission FROM orders WHERE order_id = ?',
      ['ORDER_A_201']
    );
    const orderA1 = orderA1Rows[0];
    console.log('Đơn hàng A1 trong DB:', orderA1);
    if (parseFloat(orderA1.user_commission) === 55000) {
      console.log('✔ Tăng 5% hoa hồng cá nhân thành công! (A được nhận 55% hoa hồng = 55.000 đ)');
    } else {
      throw new Error(`Đơn hàng trong hạn 30 ngày tính sai hoa hồng. Kỳ vọng 55000, thực tế nhận: ${orderA1.user_commission}`);
    }

    // 5. Test Case 3: Giả lập đơn hàng cá nhân của A phát sinh ngoài thời hạn 30 ngày (ngày 2026-07-05)
    // Tỉ lệ hoàn tiền của A phải quay về mặc định 50%.
    // Hoa hồng của A cho đơn này = 100.000 * 50% = 50.000 đ.
    console.log('\n--- Bước 5: Test Case 3 - Đơn hàng cá nhân của A NGOÀI THỜI HẠN 30 ngày bonus ---');
    const csvA2 = 
      'ID đơn hàng,Trạng thái đặt hàng,Thời Gian Đặt Hàng,Tổng hoa hồng sản phẩm(₫),Sub_id1,Item id,ID Model\n' +
      'ORDER_A_202,Hoàn thành,2026-07-05 12:00:00,100000,testreferrer,ITEM_A_2,MODEL_A_2';

    const uploadResA2 = await uploadCsvRequest(csvA2);
    console.log('API Import A2 Response:', uploadResA2.statusCode, uploadResA2.body);

    const [orderA2Rows] = await connection.execute(
      'SELECT user_commission FROM orders WHERE order_id = ?',
      ['ORDER_A_202']
    );
    const orderA2 = orderA2Rows[0];
    console.log('Đơn hàng A2 trong DB:', orderA2);
    if (parseFloat(orderA2.user_commission) === 50000) {
      console.log('✔ Đã hết hạn bonus 30 ngày, hoa hồng quay lại mặc định 50% chính xác! (50.000 đ)');
    } else {
      throw new Error(`Đơn hàng hết hạn tính sai hoa hồng. Kỳ vọng 50000, thực tế nhận: ${orderA2.user_commission}`);
    }

    // Dọn dẹp dữ liệu kiểm thử
    console.log('\n--- Dọn dẹp dữ liệu kiểm thử ---');
    await connection.execute('DELETE FROM users WHERE username IN (?, ?)', [uA.username, uB.username]);
    await connection.execute('DELETE FROM orders WHERE sub_id1 IN (?, ?)', [uA.username, uB.username]);
    console.log('✔ Đã dọn dẹp sạch sẽ dữ liệu.');

    console.log('\n=== TẤT CẢ CÁC BÀI TOÁN XÁC MINH REFERRAL SYSTEM ĐÃ THÀNH CÔNG RỰC RỠ! ===\n');

  } catch (err) {
    console.error('\n✘ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runTests();
