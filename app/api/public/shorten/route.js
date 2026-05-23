import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const RESERVED_WORDS = new Set([
  'login', 'register', 'profile', 'history', 'admin', 'instructions', 'api', 'favicon', 'static', 'uploads'
]);

function generateRandomCode(length = 8) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Hỗ trợ OPTIONS request (Preflight) của CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const { link, subId = '', affiliateId: reqAffiliateId } = await request.json();

    if (!link) {
      return NextResponse.json(
        { error: 'Thiếu thông tin đường dẫn link Shopee cần chuyển đổi' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = await getConnection();

    // 1. Phân giải affiliateId
    let affiliateId = reqAffiliateId;
    if (!affiliateId) {
      const [settings] = await db.execute(
        "SELECT setting_value FROM settings WHERE setting_key = 'guest_affiliate_id'"
      );
      affiliateId = settings[0]?.setting_value || '17399820370';
    }

    // 2. Phân giải link rút gọn Shopee (nếu có) thành link đích
    let finalUrl = link;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(link, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);
      finalUrl = res.url;
    } catch (resolveErr) {
      console.warn('Lỗi phân giải link Shopee, sử dụng link gốc trực tiếp:', resolveErr);
    }

    // 3. Xây dựng link Shopee Affiliate dài
    const encodedLink = encodeURIComponent(finalUrl);
    const longUrl = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;

    // 4. Khởi tạo mã code 8 ký tự duy nhất
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      code = generateRandomCode(8);

      if (RESERVED_WORDS.has(code.toLowerCase())) {
        continue;
      }

      const [rows] = await db.execute('SELECT id FROM short_links WHERE code = ?', [code]);
      if (rows.length === 0) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Không thể khởi tạo mã rút gọn duy nhất' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 5. Lưu ánh xạ vào bảng CSDL
    await db.execute('INSERT INTO short_links (code, long_url) VALUES (?, ?)', [code, longUrl]);

    // 6. Xây dựng link rút gọn động
    const origin = new URL(request.url).origin;
    const shortUrl = `${origin}/${code}`;

    return NextResponse.json(
      { success: true, shortUrl, longUrl, code },
      { status: 200, headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error('Public shortener API error:', error);
    return NextResponse.json(
      { error: 'Lỗi xử lý server' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
