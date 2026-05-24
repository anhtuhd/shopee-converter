const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '/Users/tubean/.gemini/antigravity/scratch/shopee-link-converter';
const STANDALONE_DIR = path.join(PROJECT_DIR, '.next', 'standalone');
const DOWNLOADS_DIR = '/Users/tubean/Downloads';
const ZIP_FILE_PATH = path.join(DOWNLOADS_DIR, 'shopee-deploy.zip');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

try {
  console.log('1. Bắt đầu build ứng dụng Next.js...');
  execSync('npm run build', { cwd: PROJECT_DIR, stdio: 'inherit' });
  console.log('✓ Build thành công!');

  if (!fs.existsSync(STANDALONE_DIR)) {
    throw new Error('Không tìm thấy thư mục standalone. Vui lòng kiểm tra lại output cấu hình trong next.config.mjs.');
  }

  console.log('2. Đang copy thư mục public vào standalone...');
  const publicSrc = path.join(PROJECT_DIR, 'public');
  const publicDest = path.join(STANDALONE_DIR, 'public');
  copyFolderSync(publicSrc, publicDest);
  console.log('✓ Copy public thành công!');

  console.log('3. Đang copy thư mục .next/static vào standalone/.next/static...');
  const staticSrc = path.join(PROJECT_DIR, '.next', 'static');
  const staticDest = path.join(STANDALONE_DIR, '.next', 'static');
  copyFolderSync(staticSrc, staticDest);
  console.log('✓ Copy .next/static thành công!');

  console.log('4. Đang copy file cấu hình production .env vào standalone...');
  const envSrc = path.join(PROJECT_DIR, '.env');
  const envDest = path.join(STANDALONE_DIR, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, envDest);
    console.log('✓ Copy .env thành công!');
  } else {
    console.log('⚠️ Cảnh báo: Không tìm thấy file .env sản xuất ở thư mục gốc.');
  }

  console.log('5. Đang nén thư mục standalone thành zip...');
  // Xóa file zip cũ nếu có
  if (fs.existsSync(ZIP_FILE_PATH)) {
    fs.unlinkSync(ZIP_FILE_PATH);
    console.log('✓ Đã xóa file shopee-deploy.zip cũ.');
  }

  // Chạy lệnh zip trên macOS để nén toàn bộ nội dung trong thư mục .next/standalone
  // Sử dụng cwd: STANDALONE_DIR để khi giải nén, các file nằm ngay tại thư mục gốc, cực kì tiện lợi cho cPanel Node app.
  console.log('Đang chạy lệnh zip...');
  execSync(`zip -r "${ZIP_FILE_PATH}" .`, { cwd: STANDALONE_DIR, stdio: 'inherit' });
  console.log(`✓ Đóng gói thành công! File zip deploy được lưu tại: ${ZIP_FILE_PATH}`);

} catch (error) {
  console.error('❌ Lỗi trong quá trình build và đóng gói:', error.message);
  process.exit(1);
}
