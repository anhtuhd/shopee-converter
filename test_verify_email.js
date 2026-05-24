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

// Helper function to send JSON requests (e.g. POST for login/register)
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

// Helper function to send GET requests (e.g. GET for verify-email)
function sendGetRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TÍNH NĂNG EMAIL VERIFICATION ===\n');
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
      username: 'testverifyuser', 
      email: 'testverifyuser@pishare.site', 
      password: 'testpassword123' 
    };

    // 1. Dọn dẹp dữ liệu test cũ
    console.log('\n--- Bước 1: Dọn dẹp dữ liệu test cũ ---');
    await connection.execute('DELETE FROM users WHERE username = ?', [uTest.username]);
    console.log('✔ Đã dọn dẹp sạch tài khoản cũ.');

    // 2. Kiểm thử API Đăng ký (/api/auth/register)
    console.log('\n--- Bước 2: Kiểm thử đăng ký tài khoản mới (cần xác thực) ---');
    const registerRes = await sendPostRequest('/api/auth/register', {
      username: uTest.username,
      email: uTest.email,
      password: uTest.password
    });
    console.log('API Register Response Status:', registerRes.statusCode);
    console.log('API Register Response Body:', registerRes.body);

    if (registerRes.statusCode !== 201 || !registerRes.body.requiresVerification) {
      throw new Error('Đăng ký không yêu cầu xác thực hoặc lỗi hệ thống.');
    }
    console.log('✔ Đăng ký thành công và nhận được cờ requiresVerification!');

    // Lấy token từ DB để test kích hoạt
    const [userRows] = await connection.execute(
      'SELECT id, is_verified, verification_token FROM users WHERE username = ?', 
      [uTest.username]
    );
    const user = userRows[0];
    console.log('Thông tin tài khoản mới tạo trong DB:', {
      id: user.id,
      is_verified: user.is_verified,
      token: user.verification_token
    });

    if (user.is_verified !== 0 || !user.verification_token) {
      throw new Error('Trạng thái kích hoạt mặc định bị lỗi trong DB.');
    }
    console.log('✔ Trạng thái DB chính xác: is_verified = 0 và token được sinh thành công.');

    // 3. Kiểm thử Đăng nhập khi CHƯA xác thực (/api/auth/login)
    console.log('\n--- Bước 3: Kiểm thử Đăng nhập khi CHƯA xác thực email ---');
    const loginFailRes = await sendPostRequest('/api/auth/login', {
      username: uTest.username,
      password: uTest.password
    });
    console.log('API Login Response Status:', loginFailRes.statusCode);
    console.log('API Login Response Body:', loginFailRes.body);

    if (loginFailRes.statusCode === 403) {
      console.log('✔ Chặn đăng nhập tài khoản chưa kích hoạt thành công (HTTP 403 Forbidden)!');
    } else {
      throw new Error('Chặn đăng nhập thất bại. Đáng lẽ phải trả về mã 403.');
    }

    // 4. Kiểm thử API Kích hoạt tài khoản (/api/auth/verify-email)
    console.log('\n--- Bước 4: Kiểm thử kích hoạt tài khoản qua Token ---');
    const verifyPath = `/api/auth/verify-email?token=${user.verification_token}`;
    const verifyRes = await sendGetRequest(verifyPath);
    console.log('API Verify Response Status:', verifyRes.statusCode);
    console.log('API Verify Redirect location:', verifyRes.headers.location);

    if (verifyRes.statusCode === 307 || verifyRes.statusCode === 302) {
      if (verifyRes.headers.location.includes('status=success')) {
        console.log('✔ API Verify chuyển hướng chính xác về trang thành công!');
      } else {
        throw new Error('API chuyển hướng về link lỗi: ' + verifyRes.headers.location);
      }
    } else {
      throw new Error('API Verify không thực hiện chuyển hướng. Status code: ' + verifyRes.statusCode);
    }

    // Kiểm tra lại DB sau khi kích hoạt
    const [userVerifiedRows] = await connection.execute(
      'SELECT is_verified, verification_token, verification_token_expiry FROM users WHERE id = ?', 
      [user.id]
    );
    const userVerified = userVerifiedRows[0];
    console.log('Thông tin tài khoản trong DB sau khi kích hoạt:', userVerified);
    if (userVerified.is_verified === 1 && userVerified.verification_token === null) {
      console.log('✔ DB cập nhật trạng thái kích hoạt chính xác: is_verified = 1, token = NULL.');
    } else {
      throw new Error('Database chưa cập nhật đúng trạng thái kích hoạt.');
    }

    // 5. Kiểm thử Đăng nhập sau khi ĐÃ kích hoạt thành công
    console.log('\n--- Bước 5: Kiểm thử Đăng nhập sau khi ĐÃ xác thực email ---');
    const loginSuccessRes = await sendPostRequest('/api/auth/login', {
      username: uTest.username,
      password: uTest.password
    });
    console.log('API Login Response Status:', loginSuccessRes.statusCode);
    console.log('API Login Response Body:', loginSuccessRes.body);

    if (loginSuccessRes.statusCode === 200 && loginSuccessRes.headers['set-cookie']) {
      console.log('✔ Đăng nhập thành công (HTTP 200)! Nhận được JWT Token cookie.');
    } else {
      throw new Error('Đăng nhập thất bại hoặc không nhận được Token.');
    }

    // 6. Dọn dẹp dữ liệu test
    console.log('\n--- Dọn dẹp dữ liệu kiểm thử ---');
    await connection.execute('DELETE FROM users WHERE username = ?', [uTest.username]);
    console.log('✔ Đã dọn dẹp sạch sẽ dữ liệu kiểm thử.');

    console.log('\n=== TẤT CẢ CÁC BÀI TOÁN XÁC MINH EMAIL VERIFICATION ĐÃ THÀNH CÔNG RỰC RỠ! ===\n');

  } catch (err) {
    console.error('\n✘ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM THỬ:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runTests();
