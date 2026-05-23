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
function postRequest(path, data) {
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
            body: body ? JSON.parse(body) : {}
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

// Helper to send OPTIONS requests (CORS Preflight)
function optionsRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://external-website.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

// Helper to send GET requests (Redirect verification)
function getRedirectRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers
        });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM TÍNH NĂNG RÚT GỌN LINK & API ===\n');
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✔ Kết nối MySQL local thành công.');
  } catch (err) {
    console.error('✘ Lỗi kết nối MySQL local. Vui lòng đảm bảo MySQL đang chạy.');
    process.exit(1);
  }

  try {
    // 1. Dọn dẹp dữ liệu cũ trước khi test
    console.log('\n--- Bước 1: Dọn dẹp dữ liệu test cũ ---');
    await connection.execute('DELETE FROM short_links WHERE long_url LIKE "%test-shortener-url%"');
    console.log('✔ Đã dọn dẹp dữ liệu test cũ.');

    // 2. Test API nội bộ /api/shorten
    console.log('\n--- Bước 2: Kiểm thử API nội bộ /api/shorten ---');
    const testLongUrl = 'https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=17399820370&sub_id=testuser&origin_link=https%3A%2F%2Fshopee.vn%2Fproduct-test-shortener-url';
    
    const shortenResult = await postRequest('/api/shorten', { longUrl: testLongUrl });
    console.log('API Response:', shortenResult.statusCode, shortenResult.body);

    if (shortenResult.statusCode === 200 && shortenResult.body.code && shortenResult.body.shortUrl) {
      console.log('✔ Tạo link rút gọn nội bộ thành công!');
    } else {
      throw new Error('Tạo link rút gọn nội bộ thất bại.');
    }

    const generatedCode = shortenResult.body.code;
    const expectedShortUrl = `http://localhost:3000/${generatedCode}`;
    if (shortenResult.body.shortUrl === expectedShortUrl) {
      console.log('✔ Link rút gọn khớp chính xác:', shortenResult.body.shortUrl);
    } else {
      throw new Error(`Link rút gọn không khớp. Mong đợi ${expectedShortUrl}, nhận được ${shortenResult.body.shortUrl}`);
    }

    // 3. Test chuyển hướng 302 từ link rút gọn GET /:code
    console.log('\n--- Bước 3: Kiểm thử Chuyển hướng (GET /:code) ---');
    const redirectResult = await getRedirectRequest(`/${generatedCode}`);
    console.log('Redirect Response Status:', redirectResult.statusCode);
    console.log('Redirect Location:', redirectResult.headers.location);

    if ((redirectResult.statusCode === 302 || redirectResult.statusCode === 307) && redirectResult.headers.location === testLongUrl) {
      console.log('✔ Chuyển hướng 302/307 thành công về đúng đường dẫn gốc!');
    } else {
      throw new Error('Chuyển hướng thất bại.');
    }

    // 4. Test OPTIONS request (CORS Preflight) cho Public API
    console.log('\n--- Bước 4: Kiểm thử CORS Preflight (OPTIONS) Public API ---');
    const optionsResult = await optionsRequest('/api/public/shorten');
    console.log('CORS Headers:', {
      'access-control-allow-origin': optionsResult.headers['access-control-allow-origin'],
      'access-control-allow-methods': optionsResult.headers['access-control-allow-methods'],
      'access-control-allow-headers': optionsResult.headers['access-control-allow-headers']
    });

    if (optionsResult.statusCode === 200 && 
        optionsResult.headers['access-control-allow-origin'] === '*' && 
        optionsResult.headers['access-control-allow-methods'].includes('POST')) {
      console.log('✔ Hỗ trợ CORS Preflight thành công!');
    } else {
      throw new Error('CORS Preflight thất bại.');
    }

    // 5. Test Public API /api/public/shorten
    console.log('\n--- Bước 5: Kiểm thử Public API /api/public/shorten ---');
    const publicResult = await postRequest('/api/public/shorten', {
      link: 'https://s.shopee.vn/606mZ14D0G', // Link Shopee thật để test giải quyết link
      subId: 'external_site_subid'
    });
    console.log('Public API Response:', publicResult.statusCode, publicResult.body);

    if (publicResult.statusCode === 200 && publicResult.body.success && publicResult.body.shortUrl) {
      console.log('✔ Public API rút gọn thành công!');
      console.log('- Link rút gọn:', publicResult.body.shortUrl);
      console.log('- Link dài gốc:', publicResult.body.longUrl);
      
      if (publicResult.body.longUrl.includes('sub_id=external_site_subid')) {
        console.log('✔ Custom Sub ID được đính kèm chính xác vào link Shopee Affiliate!');
      } else {
        throw new Error('Custom Sub ID không khớp.');
      }
    } else {
      throw new Error('Public API rút gọn thất bại.');
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
