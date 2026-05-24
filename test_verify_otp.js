const mysql = require('mysql2/promise');
const http = require('http');
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

// Helper function to send JSON POST requests
function sendPostRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
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
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TÍNH NĂNG ĐĂNG KÝ OTP & USERNAME 6 KÝ TỰ ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL local. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    const uTest = { 
      email: 'testotpuser@pishare.site', 
      password: 'testpassword123' 
    };

    // 1. Dọn dẹp dữ liệu test cũ
    console.log('\n--- Bước 1: Dọn dẹp dữ liệu test cũ ---');
    await connection.execute('DELETE FROM users WHERE email = ?', [uTest.email]);
    console.log('✔ Đã dọn dẹp sạch tài khoản test cũ.');

    // 2. Đăng ký không truyền Username (Hệ thống phải tự động sinh Username 6 ký tự)
    console.log('\n--- Bước 2: Đăng ký tài khoản không truyền Username ---');
    const registerRes = await sendPostRequest('/api/auth/register', {
      email: uTest.email,
      password: uTest.password
    });
    console.log('API Register Response Status:', registerRes.statusCode);
    console.log('API Register Response Body:', registerRes.body);

    if (registerRes.statusCode !== 201 || !registerRes.body.requiresVerification) {
      throw new Error('Đăng ký không yêu cầu xác thực OTP hoặc lỗi hệ thống.');
    }

    const createdUsername = registerRes.body.username;
    console.log(`✔ Đăng ký thành công! Username được hệ thống tự động sinh: ${createdUsername}`);

    if (createdUsername.length !== 6) {
      throw new Error(`Độ dài username tự sinh không chính xác. Kỳ vọng: 6 ký tự, thực tế nhận: ${createdUsername.length} ký tự.`);
    }
    console.log('✔ Độ dài username tự động sinh chính xác = 6 ký tự!');

    // Lấy OTP đầu tiên từ DB
    const [userRows] = await connection.execute(
      'SELECT id, is_verified, verification_token FROM users WHERE email = ?', 
      [uTest.email]
    );
    const user = userRows[0];
    const initialOtp = user.verification_token;
    console.log('Thông tin tài khoản mới tạo trong DB:', {
      id: user.id,
      username: createdUsername,
      is_verified: user.is_verified,
      otp: initialOtp
    });

    if (user.is_verified !== 0 || initialOtp.length !== 6 || isNaN(initialOtp)) {
      throw new Error('Mã OTP khởi tạo không hợp lệ trong DB.');
    }
    console.log('✔ Trạng thái DB chính xác: is_verified = 0 và mã OTP 6 chữ số hợp lệ.');

    // 3. Đăng nhập khi chưa kích hoạt OTP (phải nhận 403)
    console.log('\n--- Bước 3: Đăng nhập khi CHƯA kích hoạt OTP ---');
    const loginFailRes = await sendPostRequest('/api/auth/login', {
      username: createdUsername,
      password: uTest.password
    });
    console.log('API Login Fail Response Status:', loginFailRes.statusCode);
    console.log('API Login Fail Response Body:', loginFailRes.body);

    if (loginFailRes.statusCode !== 403) {
      throw new Error('Chặn đăng nhập thất bại. Đáng lẽ phải trả về mã 403.');
    }
    console.log('✔ Chặn đăng nhập thành công (HTTP 403 Forbidden)!');

    // 4. Kiểm thử API Gửi lại mã OTP (/api/auth/resend-otp)
    console.log('\n--- Bước 4: Kiểm thử API gửi lại mã OTP mới ---');
    const resendRes = await sendPostRequest('/api/auth/resend-otp', {
      email: uTest.email
    });
    console.log('API Resend Response Status:', resendRes.statusCode);
    console.log('API Resend Response Body:', resendRes.body);

    if (resendRes.statusCode !== 200) {
      throw new Error('Gửi lại OTP thất bại.');
    }

    // Lấy OTP mới từ DB
    const [userNewRows] = await connection.execute(
      'SELECT verification_token FROM users WHERE id = ?', 
      [user.id]
    );
    const newOtp = userNewRows[0].verification_token;
    console.log(`OTP cũ: ${initialOtp} -> OTP mới sinh lại: ${newOtp}`);

    if (newOtp === initialOtp || newOtp.length !== 6) {
      throw new Error('Gửi lại OTP lỗi: OTP mới không đổi hoặc độ dài sai.');
    }
    console.log('✔ Gửi lại OTP thành công! Mã OTP mới đã thay đổi chính xác.');

    // 5. Kiểm thử xác thực OTP SAI (/api/auth/verify-otp) (phải nhận 400)
    console.log('\n--- Bước 5: Kiểm thử xác thực OTP SAI ---');
    const verifyFailRes = await sendPostRequest('/api/auth/verify-otp', {
      email: uTest.email,
      otp: '000000' // Sai OTP
    });
    console.log('API Verify Fail Response Status:', verifyFailRes.statusCode);
    console.log('API Verify Fail Response Body:', verifyFailRes.body);

    if (verifyFailRes.statusCode !== 400) {
      throw new Error('Hệ thống chấp nhận mã OTP sai.');
    }
    console.log('✔ Hệ thống từ chối mã OTP sai chính xác (HTTP 400 Bad Request)!');

    // 6. Kiểm thử xác thực OTP ĐÚNG và TỰ ĐỘNG ĐĂNG NHẬP
    console.log('\n--- Bước 6: Kiểm thử xác thực OTP ĐÚNG & TỰ ĐỘNG ĐĂNG NHẬP ---');
    const verifySuccessRes = await sendPostRequest('/api/auth/verify-otp', {
      email: uTest.email,
      otp: newOtp
    });
    console.log('API Verify Success Response Status:', verifySuccessRes.statusCode);
    console.log('API Verify Success Response Body:', verifySuccessRes.body);

    if (verifySuccessRes.statusCode !== 200 || !verifySuccessRes.body.verified) {
      throw new Error('Xác thực OTP đúng bị thất bại.');
    }

    const hasCookie = verifySuccessRes.headers['set-cookie'] && verifySuccessRes.headers['set-cookie'].some(c => c.startsWith('auth_token='));
    if (!hasCookie) {
      throw new Error('Thiếu cookie tự động đăng nhập auth_token sau khi xác thực OTP thành công.');
    }
    console.log('✔ Xác thực OTP đúng thành công! Nhận được cookie auth_token tự động đăng nhập ngay lập tức!');

    // Kiểm tra DB sau kích hoạt
    const [userVerifiedRows] = await connection.execute(
      'SELECT is_verified, verification_token FROM users WHERE id = ?',
      [user.id]
    );
    const userVerified = userVerifiedRows[0];
    console.log('Trạng thái user trong DB sau khi xác thực:', userVerified);
    if (userVerified.is_verified === 1 && userVerified.verification_token === null) {
      console.log('✔ DB cập nhật trạng thái kích hoạt chính xác: is_verified = 1, token = NULL.');
    } else {
      throw new Error('Database chưa cập nhật đúng trạng thái kích hoạt.');
    }

    // 7. Dọn dẹp dữ liệu test
    console.log('\n--- Dọn dẹp dữ liệu kiểm thử ---');
    await connection.execute('DELETE FROM users WHERE email = ?', [uTest.email]);
    console.log('✔ Đã dọn dẹp sạch sẽ dữ liệu.');

    console.log('\n=== TẤT CẢ CÁC BÀI TOÁN XÁC MINH OTP & USERNAME 6 KÝ TỰ ĐÃ THÀNH CÔNG RỰC RỠ! ===\n');

  } catch (err) {
    console.error('\n✘ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runTests();
