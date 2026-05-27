import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

const RESERVED_WORDS = new Set([
  'login', 'register', 'profile', 'history', 'admin', 'instructions', 'notes', 'api', 'favicon', 'static', 'uploads'
]);

function generateRandomCode(length = 8) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request) {
  try {
    const { longUrl } = await request.json();

    if (!longUrl) {
      return NextResponse.json({ error: 'Thiếu thông tin đường dẫn longUrl' }, { status: 400 });
    }

    const db = await getConnection();
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Vòng lặp kiểm tra tính duy nhất của mã code
    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      code = generateRandomCode(8);

      // Tránh trùng các từ khóa hệ thống
      if (RESERVED_WORDS.has(code.toLowerCase())) {
        continue;
      }

      // Kiểm tra xem đã tồn tại trong DB chưa
      const [rows] = await db.execute('SELECT id FROM short_links WHERE code = ?', [code]);
      if (rows.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Không thể khởi tạo mã rút gọn duy nhất' }, { status: 500 });
    }

    // Lưu ánh xạ vào CSDL
    await db.execute('INSERT INTO short_links (code, long_url) VALUES (?, ?)', [code, longUrl]);

    // Dùng BASE_URL từ server-side env (không bị ảnh hưởng bởi build-time injection)
    // Hardcode pishare.site làm fallback cuối cùng thay vì dùng request.url
    // (request.url có thể trả về internal host/localhost khi chạy sau reverse proxy)
    const origin = process.env.BASE_URL || 'https://pishare.site';
    const shortUrl = `${origin}/${code}`;

    return NextResponse.json({ code, shortUrl, longUrl }, { status: 200 });

  } catch (error) {
    console.error('Error generating short link:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
