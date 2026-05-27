/**
 * BỘ CHUYỂN ĐỔI LIÊN KẾT HÀNG LOẠT TRONG BÀI VIẾT (BULK POST CONVERTER) - PHIÊN BẢN TỐI ƯU HIỆU NĂNG 🚀
 * 
 * Tác dụng: Quét bài viết, tự động gom tất cả link Shopee và gửi duy nhất 1 HTTP Request
 * lên Server để xử lý hàng loạt (Bulk API), tránh quá tải server trong giờ cao điểm.
 * 
 * Hướng dẫn sử dụng:
 * node bulk_converter.js --subId=tubean --file=post.txt --apiUrl=https://pishare.site/api/public/shorten
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Regex mạnh mẽ bắt mọi định dạng link Shopee trong văn bản
const SHOPEE_LINK_REGEX = /https?:\/\/(?:[a-zA-Z0-9-]+\.)?(?:shopee\.vn|shope\.ee|s\.shopee\.vn)\/[^\s"'\)\],;]+/g;

// Lấy tham số CLI
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const parts = arg.slice(2).split('=');
    args[parts[0]] = parts.slice(1).join('=');
  }
});

const subId = args.subId || ''; 
const filePath = args.file || ''; 
const apiUrl = args.apiUrl || 'http://localhost:3000/api/public/shorten'; 

// Hàm gọi API xử lý hàng loạt bằng 1 request duy nhất (Bulk POST Request)
function callBulkShortenerApi(shopeeLinks) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      links: shopeeLinks,
      subId: subId
    });

    const isHttps = apiUrl.startsWith('https');
    const client = isHttps ? https : http;

    const urlParts = new URL(apiUrl);
    const options = {
      hostname: urlParts.hostname,
      port: urlParts.port || (isHttps ? 443 : 80),
      path: urlParts.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000 // Tối đa 30 giây cho xử lý hàng loạt (bao gồm resolve redirect song song)
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode === 200 && parsed.success) {
            resolve({ success: true, results: parsed.results });
          } else {
            resolve({ success: false, error: parsed.error || 'Server error' });
          }
        } catch (e) {
          resolve({ success: false, error: 'Không thể parse JSON từ phản hồi server' });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: `Lỗi kết nối: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Kết nối API quá thời gian chờ (Timeout 30s)' });
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('======================================================');
  console.log('🚀 BỘ CHUYỂN ĐỔI BÀI VIẾT HÀNG LOẠT (BULK OPTIMIZED) 🚀');
  console.log(`- Thành viên áp dụng (subId): ${subId ? subId : '(Không - Sử dụng cấu hình chung)'}`);
  console.log(`- API Endpoint: ${apiUrl}`);
  console.log('======================================================\n');

  let textInput = '';

  if (filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`❌ Lỗi: Không tìm thấy file bài viết tại đường dẫn: ${absolutePath}`);
      process.exit(1);
    }
    textInput = fs.readFileSync(absolutePath, 'utf8');
    console.log(`✔ Đã đọc bài viết từ file: ${filePath}`);
  } else {
    // Nhận bài viết demo mặc định
    textInput = `
🔥 SIÊU SALE GIỮA THÁNG - SĂN ĐỒ CÔNG NGHỆ GIÁ SỐC 🔥

Xin chào mọi người! Dưới đây là các deal cực hời hôm nay các bạn không nên bỏ lỡ nhé:

1. Tai nghe Bluetooth chụp tai âm thanh cực hay, chống ồn đỉnh cao:
👉 Xem chi tiết tại đây: https://s.shopee.vn/8f3gHjKL
(Áp mã giảm thêm 15% tại giỏ hàng)

2. Củ sạc nhanh 65W nhỏ gọn tiện lợi dành cho cả laptop và điện thoại:
👉 Đặt mua ngay: https://shopee.vn/product/12345/67890
Nhập mã "TECH65W" để được miễn phí vận chuyển.

3. Kệ đỡ laptop nhôm tản nhiệt 6 góc độ chịu lực cao:
👉 Link mua giá rẻ: https://shope.ee/5f3gHjKL

Chúc các bạn săn sale vui vẻ! Mọi thắc mắc cứ nhắn mình nha.
    `;
    console.log('ℹ Gợi ý: Bạn chưa truyền tham số --file, hệ thống đang dùng đoạn văn bản demo dưới đây:');
  }

  // 1. Quét tìm toàn bộ link Shopee
  const matches = textInput.match(SHOPEE_LINK_REGEX) || [];
  const uniqueLinks = Array.from(new Set(matches));

  if (uniqueLinks.length === 0) {
    console.log('ℹ Không tìm thấy bất kỳ liên kết Shopee nào trong đoạn văn bản.');
    console.log('------------------------------------------------------');
    console.log(textInput);
    return;
  }

  console.log(`🔎 Phát hiện ${uniqueLinks.length} liên kết Shopee độc nhất.`);
  console.log('⏳ Gửi 1 yêu cầu DUY NHẤT để xử lý hàng loạt trên Server (Bulk Request)...');

  // 2. Gọi API xử lý hàng loạt (Chỉ tốn đúng 1 HTTP Connection đến server của bạn!)
  const startTime = Date.now();
  const apiRes = await callBulkShortenerApi(uniqueLinks);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!apiRes.success) {
    console.error(`❌ Chuyển đổi hàng loạt thất bại: ${apiRes.error}`);
    process.exit(1);
  }

  console.log(`✔ Server đã xử lý xong toàn bộ link trong ${duration} giây.`);

  // 3. Thực hiện thay thế link trong văn bản gốc
  let convertedText = textInput;
  let successCount = 0;

  Object.entries(apiRes.results).forEach(([original, converted]) => {
    if (converted && converted !== original) {
      successCount++;
      convertedText = convertedText.split(original).join(converted);
      console.log(`  [OK] Chuyển đổi thành công: ${original} ➜ ${converted}`);
    } else {
      console.log(`  [FAIL] Giữ nguyên link gốc: ${original}`);
    }
  });

  console.log(`\n================ KẾT QUẢ ĐÃ CHUYỂN ĐỔI (${successCount}/${uniqueLinks.length} THÀNH CÔNG) ================`);
  console.log(convertedText.trim());
  console.log('========================================================================================\n');

  if (filePath) {
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const outPath = path.join(dir, `${base}_converted${ext}`);
    fs.writeFileSync(outPath, convertedText, 'utf8');
    console.log(`💾 Đã xuất kết quả bài viết mới thành công sang file: ${outPath}`);
  }
}

run();
