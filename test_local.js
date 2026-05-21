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
    console.log('\n--- Bước 3: Kiểm thử Import CSV (Unique key = ID đơn hàng + Item id + ID Model, lấy Tổng hoa hồng sản phẩm(₫)) ---');
    
    // Tạo nội dung CSV test dạng tệp TSV (phân tách tab) với dữ liệu 4 sản phẩm mẫu của người dùng
    const csvContent = 
`ID đơn hàng	Trạng thái đặt hàng	Checkout id	Thời Gian Đặt Hàng	Thời gian hoàn thành	Thời gian Click	Tên Shop	Shop id	Loại Shop	Item id	Tên Item	ID Model	Loại sản phẩm	Promotion id	L1 Danh mục toàn cầu	L2 Danh mục toàn cầu	L3 Danh mục toàn cầu	Giá(₫)	Số lượng	Loại Hoa hồng	Đối tác chiến dịchr	Giá trị đơn hàng (₫)	Số tiền hoàn trả (₫)	Tỷ lệ sản phẩm hoa hồng Shope	Hoa hồng Shopee trên sản phẩm(₫)	Tỷ lệ sản phẩm hoa hồng người bán	Hoa hồng Xtra trên sản phẩm(₫)	Tổng hoa hồng sản phẩm(₫)	Hoa hồng đơn hàng từ Shopee(₫)	Hoa hồng đơn hàng từ Người bán(₫)	Tổng hoa hồng đơn hàng(₫)	Tên MNC đã liên kết	Mã hợp đồng MCN	Mức phí quản lý MCN	Phí quản lý MCN(₫)	Mức hoa hồng tiếp thị liên kết theo thỏa thuận	Hoa hồng ròng tiếp thị liên kết(₫)	Trạng thái sản phẩm liên kết	Ghi chú sản phẩm	Loại thuộc tính	Trạng thái người mua	Sub_id1	Sub_id2	Sub_id3	Sub_id4	Sub_id5	Kênh
260520V3JDN16Q	Đang chờ xử lý	232965912204230	2026-05-20 15:45:13		2026-05-20 15:43:53	Unilever - Chăm sóc Gia đình	26947756	Shopee Mall(Non-CB)	24281325893	Sữa Tắm Lifebuoy 800gr Detox Và Sạch Sâu Khỏi Bụi Mịn Pm2.5 Detox 100% Từ Thiên Nhiên Diệt Khuẩn	255901029631	Normal Product		Sắc Đẹp	Tắm & chăm sóc cơ thể	Xà phòng & sữa tắm	197000	1	XTRA Comm		153660		4.00%	6146.4	2.00%	3073.2	9219.6	16629.6	8767.2	25396.8		0	0.00%	0	100.00%	25396.8	Đang chờ xử lý	"Trạng thái của sản phẩm đang chờ xử lý"	Đơn hàng từ cùng một Shop	Đã tồn tại	testuserlocal					Zalo
260520V3JDN16Q	Đang chờ xử lý	232965912204230	2026-05-20 15:45:13		2026-05-20 15:43:53	Unilever - Chăm sóc Gia đình	26947756	Shopee Mall(Non-CB)	25950264006	Nước Xả Vải Comfort Hương Nước Hoa 100 Giờ Lưu Hương túi 3.7L	108744860209	Normal Product		Nhà cửa & Đời sống	Dụng cụ chăm sóc nhà cửa	Phụ kiện giặt là	278000	1	XTRA Comm		216840		4.00%	8673.6	2.00%	4336.8	13010.4	0	0	0		0	0.00%	0	100.00%	0	Đang chờ xử lý	"Trạng thái của sản phẩm đang chờ xử lý"	Đơn hàng từ cùng một Shop	Đã tồn tại	testuserlocal					Zalo
260520V3JDN16Q	Đang chờ xử lý	232965912204230	2026-05-20 15:45:13		2026-05-20 15:43:53	Unilever - Chăm sóc Gia đình	26947756	Shopee Mall(Non-CB)	6479896522	Viên Treo Vệ Sinh Bồn Cầu Vim Power 5 | Sạch Thơm Đến 300 Lần Xả	73780586787	Normal Product		Nhà cửa & Đời sống	Dụng cụ chăm sóc nhà cửa	Chất tẩy rửa	30000	1	XTRA Comm		23400		4.00%	936	3.00%	702	1638	0	0	0		0	0.00%	0	100.00%	0	Đang chờ xử lý	"Trạng thái của sản phẩm đang chờ xử lý"	Đơn hàng từ cùng một Shop	Đã tồn tại	testuserlocal					Zalo
260520V3JDN16Q	Đang chờ xử lý	232965912204230	2026-05-20 15:45:13		2026-05-20 15:43:53	Unilever - Chăm sóc Gia đình	26947756	Shopee Mall(Non-CB)	6479896522	Viên Treo Vệ Sinh Bồn Cầu Vim Power 5 | Sạch Thơm Đến 300 Lần Xả	73780586788	Normal Product		Nhà cửa & Đời sống	Dụng cụ chăm sóc nhà cửa	Chất tẩy rửa	28000	1	XTRA Comm		21840		4.00%	873.6	3.00%	655.2	1528.8	0	0	0		0	0.00%	0	100.00%	0	Đang chờ xử lý	"Trạng thái của sản phẩm đang chờ xử lý"	Đơn hàng từ cùng một Shop	Đã tồn tại	testuserlocal					Zalo`;

    console.log('Gửi yêu cầu upload file CSV chứa 4 sản phẩm mẫu...');
    const csvResult = await uploadCSVRequest('/api/admin/csv', csvContent, authCookie);
    console.log('Kết quả Import CSV:', csvResult.statusCode, csvResult.body);

    if (csvResult.statusCode === 200) {
      console.log('✔ Import CSV thành công không bị lỗi Duplicate entry!');
    } else {
      throw new Error('Import CSV thất bại: ' + JSON.stringify(csvResult.body));
    }

    // Kiểm tra trong DB xem số lượng dòng đơn hàng được tạo (phải là 4 dòng)
    const [orderRows] = await connection.execute('SELECT * FROM orders WHERE order_id = "260520V3JDN16Q" ORDER BY price DESC');
    console.log(`Số dòng đơn hàng trong Database: ${orderRows.length}`);
    if (orderRows.length === 4) {
      console.log('✔ Đúng! 4 sản phẩm với các ID Model khác nhau đã được lưu thành 4 bản ghi riêng biệt.');
      
      // Kiểm tra giá trị hoa hồng của từng dòng sản phẩm
      const expectedCommissions = [
        { model: '108744860209', total: 13010.4, user: 6505.2 },
        { model: '255901029631', total: 9219.6, user: 4609.8 },
        { model: '73780586787', total: 1638.0, user: 819.0 },
        { model: '73780586788', total: 1528.8, user: 764.4 }
      ];

      for (let i = 0; i < orderRows.length; i++) {
        const row = orderRows[i];
        const exp = expectedCommissions.find(e => e.model === row.model_id);
        if (exp) {
          console.log(`- Model ${row.model_id}: Hoa hồng sản phẩm = ${row.total_commission} (Kỳ vọng: ${exp.total}), User hoàn tiền = ${row.user_commission} (Kỳ vọng: ${exp.user})`);
          if (parseFloat(row.total_commission) === exp.total && parseFloat(row.user_commission) === exp.user) {
            console.log(`  ✔ Khớp chính xác!`);
          } else {
            throw new Error(`  ✘ Lệch hoa hồng cho model ${row.model_id}!`);
          }
        } else {
          throw new Error(`  ✘ Tìm thấy model_id lạ: ${row.model_id}`);
        }
      }
    } else {
      throw new Error('Lỗi: Số lượng dòng đơn hàng không đúng. Kỳ vọng 4 dòng, thực tế: ' + orderRows.length);
    }

    // Thử nghiệm case "Đã thanh toán" không bị ghi đè
    console.log('\nCập nhật trạng thái đơn hàng model "73780586788" thành "Đã thanh toán" trực tiếp trong DB...');
    await connection.execute('UPDATE orders SET status = "Đã thanh toán" WHERE order_id = "260520V3JDN16Q" AND model_id = "73780586788"');
    
    console.log('Thực hiện Import lại file CSV với trạng thái mới "Hoàn thành" để xem có bị ghi đè không...');
    // Thay đổi trạng thái cả 4 đơn thành "Hoàn thành"
    const csvContent2 = csvContent.replace(/Đang chờ xử lý/g, 'Hoàn thành');

    const csvResult2 = await uploadCSVRequest('/api/admin/csv', csvContent2, authCookie);
    console.log('Kết quả Import CSV lần 2:', csvResult2.statusCode, csvResult2.body);

    const [orderRows2] = await connection.execute('SELECT model_id, status FROM orders WHERE order_id = "260520V3JDN16Q"');
    for (const r of orderRows2) {
      if (r.model_id === '73780586788') {
        console.log(`Model 73780586788 status: ${r.status}`);
        if (r.status === 'Đã thanh toán') {
          console.log('✔ Chính xác! Đơn hàng đã ở trạng thái "Đã thanh toán" thì KHÔNG bị ghi đè.');
        } else {
          throw new Error('Lỗi: Đơn hàng "Đã thanh toán" đã bị ghi đè trạng thái thành ' + r.status);
        }
      } else {
        console.log(`Model ${r.model_id} status: ${r.status} (được cập nhật thành Hoàn thành)`);
      }
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
