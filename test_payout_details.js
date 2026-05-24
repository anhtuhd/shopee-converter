const mysql = require('mysql2/promise');
const http = require('http');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Tải .env.local để lấy thông số kết nối DB
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

// Mock tokens
const userToken = jwt.sign({ userId: 998, username: 'testuser_payout', role: 'user' }, JWT_SECRET);
const adminToken = jwt.sign({ userId: 1, role: 'admin' }, JWT_SECRET);

function makeGetRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=' + token
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
    req.end();
  });
}

async function run() {
  console.log('=== CHẠY THỬ NGHIỆM ĐỐI SOÁT & BREAKDOWN THANH TOÁN ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    // 1. Dọn dẹp dữ liệu cũ & Tạo tài khoản thử nghiệm
    console.log('\n--- Bước 1: Tạo người dùng thử nghiệm ---');
    await connection.execute('DELETE FROM users WHERE username IN (?, ?)', ['testuser_payout', 'testreferred_payout']);
    await connection.execute('DELETE FROM orders WHERE sub_id1 IN (?, ?)', ['testuser_payout', 'testreferred_payout']);
    
    // Thêm User A (Người giới thiệu)
    const [userAResult] = await connection.execute(
      "INSERT INTO users (id, username, email, password_hash, role, is_verified) VALUES (998, 'testuser_payout', 'testuser_payout@pishare.site', 'hash', 'user', 1)"
    );
    // Thêm User B (Người được giới thiệu)
    const [userBResult] = await connection.execute(
      "INSERT INTO users (id, username, email, password_hash, role, is_verified) VALUES (999, 'testreferred_payout', 'testreferred_payout@pishare.site', 'hash', 'user', 1)"
    );
    
    // Tạo mối quan hệ referrals
    await connection.execute('DELETE FROM referrals WHERE referrer_id = 998');
    await connection.execute(
      "INSERT INTO referrals (referrer_id, referred_id, created_at, first_order_completed_at) VALUES (998, 999, NOW(), NOW())"
    );

    // 2. Thêm đơn hàng mẫu
    console.log('\n--- Bước 2: Tạo đơn hàng thử nghiệm ---');
    
    // Đơn hàng 1: Đơn cá nhân của User A (Hoàn thành) -> 50,000 đ
    await connection.execute(`
      INSERT INTO orders (order_id, sub_id1, status, order_time, completed_time, total_commission, user_commission, referrer_commission, referrer_payout_status)
      VALUES ('ORD_PERSONAL_1', 'testuser_payout', 'Hoàn thành', NOW(), NOW(), 100000, 50000, 0, 'Đang chờ')
    `);

    // Đơn hàng 2: Đơn giới thiệu từ User B (Cấp dưới) -> 5,000 đ cho User A
    await connection.execute(`
      INSERT INTO orders (order_id, sub_id1, status, order_time, completed_time, total_commission, user_commission, referrer_id, referrer_commission, referrer_payout_status)
      VALUES ('ORD_REFERRAL_1', 'testreferred_payout', 'Hoàn thành', NOW(), NOW(), 100000, 50000, 998, 5000, 'Đang chờ')
    `);

    // Đơn hàng 3: Đơn cá nhân của User A đã thanh toán -> 30,000 đ
    await connection.execute(`
      INSERT INTO orders (order_id, sub_id1, status, order_time, completed_time, total_commission, user_commission, referrer_commission, referrer_payout_status)
      VALUES ('ORD_PERSONAL_PAID', 'testuser_payout', 'Đã thanh toán', NOW(), NOW(), 60000, 30000, 0, 'Đang chờ')
    `);

    // Đơn hàng 4: Đơn giới thiệu của User B đã thanh toán thụ động -> 4,000 đ cho User A
    await connection.execute(`
      INSERT INTO orders (order_id, sub_id1, status, order_time, completed_time, total_commission, user_commission, referrer_id, referrer_commission, referrer_payout_status)
      VALUES ('ORD_REFERRAL_PAID', 'testreferred_payout', 'Đã thanh toán', NOW(), NOW(), 80000, 40000, 998, 4000, 'Đã thanh toán')
    `);

    console.log('✔ Đã tạo các đơn hàng thử nghiệm.');

    // 3. Gọi User Profile API và kiểm tra breakdown
    console.log('\n--- Bước 3: Gọi API Profile `/api/profile` ---');
    const profileRes = await makeGetRequest('/api/profile', userToken);
    
    if (profileRes.statusCode !== 200) {
      throw new Error(`Profile API trả về mã lỗi: ${profileRes.statusCode}`);
    }

    const referralData = profileRes.body.referral;
    console.log('Thông tin referral trả về từ API:');
    console.log(`- pendingPersonal: ${referralData.pendingPersonal} đ (Mong đợi: 50000)`);
    console.log(`- pendingReferral: ${referralData.pendingReferral} đ (Mong đợi: 5000)`);
    console.log(`- pendingPayout: ${referralData.pendingPayout} đ (Mong đợi: 55000)`);
    console.log(`- paidPersonal: ${referralData.paidPersonal} đ (Mong đợi: 30000)`);
    console.log(`- paidReferral: ${referralData.paidReferral} đ (Mong đợi: 4000)`);
    console.log(`- paidPayout: ${referralData.paidPayout} đ (Mong đợi: 34000)`);

    // Kiểm tra tính chính xác của các cột
    if (
      referralData.pendingPersonal !== 50000 ||
      referralData.pendingReferral !== 5000 ||
      referralData.pendingPayout !== 55000 ||
      referralData.paidPersonal !== 30000 ||
      referralData.paidReferral !== 4000 ||
      referralData.paidPayout !== 34000
    ) {
      throw new Error('✘ Các giá trị số dư trong API Profile không khớp với mong đợi!');
    }
    console.log('✔ Kiểm tra API Profile: ĐẠT');

    // Kiểm tra referrer_payout_status có trong danh sách referralOrders
    const refOrders = referralData.referralOrders;
    const testOrder = refOrders.find(o => o.order_id === 'ORD_REFERRAL_1');
    if (!testOrder || testOrder.referrer_payout_status !== 'Đang chờ') {
      throw new Error('✘ Trường referrer_payout_status bị thiếu hoặc giá trị sai trong referralOrders!');
    }
    console.log('✔ Kiểm tra trường referrer_payout_status: ĐẠT');

    // 4. Gọi Admin Payout API và kiểm tra đối soát
    console.log('\n--- Bước 4: Gọi API Admin Payout `/api/admin/payouts` ---');
    
    // Ngày mai
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const cutoffDate = tomorrow.toISOString().split('T')[0];
    
    const adminRes = await makeGetRequest(`/api/admin/payouts?cutoffDate=${cutoffDate}`, adminToken);
    
    if (adminRes.statusCode !== 200) {
      throw new Error(`Admin Payout API trả về mã lỗi: ${adminRes.statusCode}`);
    }

    const userPayout = adminRes.body.payouts.find(p => p.username === 'testuser_payout');
    if (!userPayout) {
      throw new Error('✘ Không tìm thấy dòng đối soát của testuser_payout trong kết quả của Admin!');
    }

    console.log('Thông tin đối soát Admin của testuser_payout:');
    console.log(`- personal_payout: ${userPayout.personal_payout} đ (Mong đợi: 50000)`);
    console.log(`- referral_payout: ${userPayout.referral_payout} đ (Mong đợi: 5000)`);
    console.log(`- total_payout: ${userPayout.total_payout} đ (Mong đợi: 55000)`);
    console.log(`- order_count: ${userPayout.order_count} đơn (Mong đợi: 2)`);

    if (
      parseFloat(userPayout.personal_payout) !== 50000 ||
      parseFloat(userPayout.referral_payout) !== 5000 ||
      parseFloat(userPayout.total_payout) !== 55000 ||
      parseInt(userPayout.order_count) !== 2
    ) {
      throw new Error('✘ Dữ liệu đối soát Admin không khớp với mong đợi!');
    }
    console.log('✔ Kiểm tra API Admin Payout: ĐẠT');

    console.log('\n🎉 TOÀN BỘ CÁC THỬ NGHIỆM ĐÃ THÀNH CÔNG RỰC RỠ!');
  } catch (error) {
    console.error('\n✘ Thử nghiệm thất bại với lỗi:', error.message);
  } finally {
    // Dọn dẹp dữ liệu test
    console.log('\n--- Bước 5: Dọn dẹp dữ liệu ---');
    await connection.execute('DELETE FROM users WHERE username IN (?, ?)', ['testuser_payout', 'testreferred_payout']);
    await connection.execute('DELETE FROM orders WHERE sub_id1 IN (?, ?)', ['testuser_payout', 'testreferred_payout']);
    await connection.execute('DELETE FROM referrals WHERE referrer_id = 998');
    await connection.end();
    console.log('✔ Kết nối cơ sở dữ liệu đã đóng.');
  }
}

run();
