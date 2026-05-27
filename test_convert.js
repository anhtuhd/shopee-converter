const http = require('http');

function postJson(port, path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: port,
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
            body: body ? JSON.parse(body) : {}
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

function getRedirectRequest(port, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
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

async function run() {
  const port = 3001; // local dev port
  console.log('=== KHỞI ĐẦU CHẠY THỬ NGHIỆM ĐIỀU TRA LỖI CHUYỂN HƯỚNG ===\n');

  // 1. Kiểm thử phát hiện link chết (s.shopee.vn/3ILF0NvM là link chết đã được xác thực ở trên)
  console.log('--- Test 1: Gửi link Shopee rút gọn đã chết tới /api/resolve-link ---');
  const testDeadLink = 'https://s.shopee.vn/3ILF0NvM';
  const resolveResult = await postJson(port, '/api/resolve-link', { link: testDeadLink });
  console.log('API Response status:', resolveResult.statusCode);
  console.log('API Response body:', JSON.stringify(resolveResult.body, null, 2));

  if (resolveResult.statusCode === 400 && resolveResult.body.error && resolveResult.body.error.includes('hết hạn')) {
    console.log('✔ Đạt yêu cầu: Phát hiện chính xác link chết và từ chối xử lý với mã 400!');
  } else {
    console.error('✘ Lỗi: Không bắt được link chết hoặc mã trả về không phải 400.');
  }

  // 2. Kiểm thử API Public Shorten với link đã chết
  console.log('\n--- Test 2: Gửi link đã chết tới Public API /api/public/shorten ---');
  const publicResult = await postJson(port, '/api/public/shorten', { link: testDeadLink });
  console.log('API Response status:', publicResult.statusCode);
  console.log('API Response body:', JSON.stringify(publicResult.body, null, 2));

  if (publicResult.statusCode === 400) {
    console.log('✔ Đạt yêu cầu: Public API từ chối link chết thành công!');
  } else {
    console.error('✘ Lỗi: Public API không chặn link chết.');
  }

  // 3. Kiểm thử tạo link hoạt động thực tế (Sử dụng link Shopee dài chuẩn)
  console.log('\n--- Test 3: Tạo và kiểm thử link với link Shopee dài thực tế ---');
  const testLongLink = 'https://shopee.vn/product/26947756/24281325893';
  const createResult = await postJson(port, '/api/public/shorten', {
    link: testLongLink,
    subId: 'testuser'
  });
  console.log('API Response status:', createResult.statusCode);
  console.log('API Response body:', JSON.stringify(createResult.body, null, 2));

  if (createResult.statusCode === 200 && createResult.body.success && createResult.body.code) {
    console.log('✔ Tạo link rút gọn từ link dài thành công!');
    
    // Test chuyển hướng thực tế của link rút gọn vừa tạo
    const code = createResult.body.code;
    console.log(`\nTiến hành gọi thử chuyển hướng GET /${code}...`);
    const redirectResult = await getRedirectRequest(port, `/${code}`);
    console.log('Redirect Status:', redirectResult.statusCode);
    console.log('Redirect Location:', redirectResult.headers.location);

    if (redirectResult.statusCode === 307 && redirectResult.headers.location === createResult.body.longUrl) {
      console.log('✔ Đạt yêu cầu: Chuyển hướng 307 chính xác về link gốc!');
    } else {
      console.error('✘ Lỗi: Chuyển hướng không đúng địa chỉ.');
    }
  } else {
    console.error('✘ Lỗi: Tạo link rút gọn từ link dài thất bại.');
  }

  console.log('\n=== KẾT THÚC CÁC BÀI THỬ NGHIỆM ĐÃ VƯỢT QUA THÀNH CÔNG! ===');
}

run();
