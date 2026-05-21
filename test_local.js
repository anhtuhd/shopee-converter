const mysql = require('mysql2/promise');
const http = require('http');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'defaultdb',
  port: 3306
};

// Helper function to send POST requests
function postRequest(path, data, cookies = '') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookies
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : {}
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

// Helper to send multipart form data (used for CSV upload)
function uploadCSVRequest(path, csvContent, cookies) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let data = '';
    data += '--' + boundary + '\r\n';
    data += 'Content-Disposition: form-data; name="csv_file"; filename="test.csv"\r\n';
    data += 'Content-Type: text/csv\r\n\r\n';
    data += csvContent + '\r\n';
    data += '--' + boundary + '--\r\n';

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': Buffer.byteLength(data),
        'Cookie': cookies
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
    req.write(data);
    req.end();
  });
}

// Helper to send GET requests
function getRequest(path) {
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
          body: body
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TRÊN LOCAL ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL local. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    // 0. Clean up previous test users & orders
    console.log('\n--- Bước 0: Dọn dẹp dữ liệu thử nghiệm cũ ---');
    await connection.execute('DELETE FROM orders WHERE sub_id1 = "testuserlocal"');
    await connection.execute('DELETE FROM users WHERE username = "testuserlocal"');
    console.log('✔ Đã xóa dữ liệu test cũ nếu có.');

    // 1. Test registration with uppercase letter & Default Commission
    console.log('\n--- Bước 1: Kiểm thử Đăng ký tài khoản (chứa chữ hoa và mặc định Hoa hồng 0.5) ---');
    const regResult = await postRequest('/api/auth/register', {
      username: 'TestUserLocal', // Chứa chữ hoa
      email: 'testuserlocal@pishare.site',
      password: 'TestPass123'
    });
    console.log('Kết quả Đăng ký API:', regResult.statusCode, regResult.body);

    if (regResult.statusCode === 201) {
      console.log('✔ Đăng ký thành công qua API!');
    } else {
      throw new Error('Đăng ký qua API thất bại.');
    }

    // Kiểm tra trong DB
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', ['testuserlocal@pishare.site']);
    if (rows.length > 0) {
      const user = rows[0];
      console.log('Dữ liệu user trong MySQL:', {
        username: user.username,
        email: user.email,
        commission_rate: user.commission_rate,
        role: user.role
      });

      if (user.username === 'testuserlocal') {
        console.log('✔ Tên đăng nhập được lưu trữ dạng CHỮ THƯỜNG (không phân biệt chữ hoa/thường).');
      } else {
        console.error('✘ Lỗi: Tên đăng nhập không được chuẩn hóa thành chữ thường.');
      }

      if (parseFloat(user.commission_rate) === 0.5) {
        console.log('✔ Mức hoa hồng mặc định của user mới tạo là 0.5.');
      } else {
        console.error('✘ Lỗi: Mức hoa hồng mặc định không phải là 0.5.');
      }

      // Cấp quyền Admin cho user này để test tính năng Import CSV của Admin
      await connection.execute('UPDATE users SET role = "admin" WHERE id = ?', [user.id]);
      console.log('✔ Đã cấp quyền Admin cho user test để chuẩn bị test Import CSV.');
    } else {
      throw new Error('Không tìm thấy user trong Database.');
    }

    // 2. Test Login (không phân biệt chữ hoa, chữ thường)
    console.log('\n--- Bước 2: Kiểm thử Đăng nhập (không phân biệt chữ hoa/thường) ---');
    
    // Test đăng nhập bằng chữ thường
    console.log('Thử đăng nhập với username chữ thường "testuserlocal":');
    const loginResultLower = await postRequest('/api/auth/login', {
      username: 'testuserlocal',
      password: 'TestPass123'
    });
    console.log('Kết quả Đăng nhập:', loginResultLower.statusCode, loginResultLower.body);
    
    // Test đăng nhập bằng chữ hoa
    console.log('Thử đăng nhập với username chữ hoa "TESTUSERLOCAL":');
    const loginResultUpper = await postRequest('/api/auth/login', {
      username: 'TESTUSERLOCAL',
      password: 'TestPass123'
    });
    console.log('Kết quả Đăng nhập:', loginResultUpper.statusCode, loginResultUpper.body);

    if (loginResultLower.statusCode === 200 && loginResultUpper.statusCode === 200) {
      console.log('✔ Đăng nhập thành công với cả chữ thường và chữ hoa!');
    } else {
      throw new Error('Đăng nhập thất bại.');
    }

    // Lấy cookie token của Admin
    const setCookieHeader = loginResultLower.headers['set-cookie'];
    const authCookie = setCookieHeader ? setCookieHeader[0].split(';')[0] : '';
    console.log('Lấy được Auth Cookie để gửi request Admin:', authCookie);

    // 3. Test Import CSV (tránh Duplicate Entry và xử lý Đã thanh toán)
    console.log('\n--- Bước 3: Kiểm thử Import CSV (Không có Duplicate Entry, xử lý trùng lặp và Đã thanh toán) ---');
    
    // Tạo nội dung CSV test dạng tệp TSV (phân tách tab)
    const csvContent = 
`ID đơn hàng	Trạng thái đặt hàng	Item id	Tên Item	Hoa hồng ròng tiếp thị liên kết(₫)	Sub_id1
LOCAL_ORDER_100	Hoàn thành	6479896522	Shopee Product A	10000	testuserlocal
LOCAL_ORDER_100	Đang chờ xử lý	6479896522	Shopee Product A	10000	testuserlocal`; // Trùng key ngay trong file CSV

    console.log('Gửi yêu cầu upload file CSV chứa trùng lặp key (ID đơn hàng + Item id)...');
    const csvResult = await uploadCSVRequest('/api/admin/csv', csvContent, authCookie);
    console.log('Kết quả Import CSV:', csvResult.statusCode, csvResult.body);

    if (csvResult.statusCode === 200) {
      console.log('✔ Import CSV thành công không bị lỗi Duplicate entry!');
    } else {
      throw new Error('Import CSV thất bại: ' + JSON.stringify(csvResult.body));
    }

    // Kiểm tra trong DB xem trạng thái đơn hàng là gì (phải là trạng thái cuối cùng được cập nhật hoặc không bị lỗi)
    const [orderRows] = await connection.execute('SELECT * FROM orders WHERE order_id = "LOCAL_ORDER_100"');
    console.log(`Số dòng đơn hàng trong Database: ${orderRows.length}`);
    if (orderRows.length === 1) {
      console.log('✔ Chỉ có duy nhất 1 bản ghi được tạo (không bị nhân đôi hay lỗi khóa trùng lặp).');
      console.log('Trạng thái đơn hàng hiện tại:', orderRows[0].status);
    } else {
      throw new Error('Lỗi: Số lượng dòng đơn hàng không đúng.');
    }

    // Thử nghiệm case "Đã thanh toán"
    console.log('\nCập nhật trạng thái đơn hàng thành "Đã thanh toán" trực tiếp trong DB...');
    await connection.execute('UPDATE orders SET status = "Đã thanh toán" WHERE order_id = "LOCAL_ORDER_100"');
    
    console.log('Thực hiện Import lại file CSV với trạng thái mới "Đã hủy" để xem có bị ghi đè không...');
    const csvContent2 = 
`ID đơn hàng	Trạng thái đặt hàng	Item id	Tên Item	Hoa hồng ròng tiếp thị liên kết(₫)	Sub_id1
LOCAL_ORDER_100	Đã hủy	6479896522	Shopee Product A	10000	testuserlocal`;

    const csvResult2 = await uploadCSVRequest('/api/admin/csv', csvContent2, authCookie);
    console.log('Kết quả Import CSV lần 2:', csvResult2.statusCode, csvResult2.body);

    const [orderRows2] = await connection.execute('SELECT status FROM orders WHERE order_id = "LOCAL_ORDER_100"');
    console.log('Trạng thái đơn hàng sau khi Import lại:', orderRows2[0].status);
    if (orderRows2[0].status === 'Đã thanh toán') {
      console.log('✔ Chính xác! Đơn hàng đã ở trạng thái "Đã thanh toán" thì KHÔNG bị ghi đè cập nhật.');
    } else {
      throw new Error('Lỗi: Đơn hàng "Đã thanh toán" đã bị ghi đè trạng thái thành ' + orderRows2[0].status);
    }

    // 4. Test page Hướng dẫn (/instructions)
    console.log('\n--- Bước 4: Kiểm thử trang Hướng dẫn (/instructions) ---');
    const pageResult = await getRequest('/instructions');
    console.log('HTTP Status trang Hướng dẫn:', pageResult.statusCode);
    if (pageResult.statusCode === 200) {
      console.log('✔ Trang Hướng dẫn (/instructions) hoạt động bình thường, trả về 200 OK.');
    } else {
      throw new Error('Lỗi: Trang Hướng dẫn trả về status ' + pageResult.statusCode);
    }

    console.log('\n=== TẤT CẢ CÁC BÀI THỬ NGHIỆM ĐÃ VƯỢT QUA THÀNH CÔNG! ===\n');

  } catch (err) {
    console.error('\n✘ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH THỬ NGHIỆM:', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runTests();
