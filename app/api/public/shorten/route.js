import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

// Hàm phân giải link rút gọn Shopee cực kỳ mạnh mẽ và bền bỉ
async function resolveShopeeShortLink(link) {
  let currentUrl = link;
  let depth = 0;
  const maxDepth = 5;

  while (depth < maxDepth && (currentUrl.includes('s.shopee.vn') || currentUrl.includes('shope.ee') || currentUrl.includes('shp.ee') || currentUrl.includes('vn.shp.ee'))) {
    depth++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      // 1. Thử manual redirect để bắt Location header nhanh gọn không tải HTML
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      clearTimeout(timeoutId);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (location) {
          currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
          continue;
        }
      }

      // 2. Thử follow redirect tự động nếu không có header
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 6000);
      const resFollow = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        }
      });
      clearTimeout(timeoutId2);
      
      if (resFollow.url && resFollow.url !== currentUrl) {
        currentUrl = resFollow.url;
        continue;
      }

      // 3. Phân tích mã nguồn HTML để trích xuất location thay thế nếu Shopee dùng JS redirect
      const html = await resFollow.text();
      const match = html.match(/href="([^"]+)"/) || html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/) || html.match(/window\.location\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        currentUrl = match[1];
      } else {
        break;
      }
    } catch (err) {
      console.error('[Resolve Public Link Helper] Lỗi phân giải tại depth', depth, ':', err.message);
      break;
    }
  }

  return currentUrl;
}

// Hỗ trợ OPTIONS request (Preflight) của CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request) {
  try {
    const { link, links, subId = '', affiliateId: reqAffiliateId } = await request.json();

    if (!link && (!links || !Array.isArray(links) || links.length === 0)) {
      return NextResponse.json(
        { error: 'Thiếu thông tin đường dẫn link Shopee cần chuyển đổi (truyền trường "link" hoặc mảng "links")' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const db = await getConnection();

    // 1. Phân giải affiliateId (Chỉ chạy 1 lần duy nhất cho toàn bộ request)
    let affiliateId = reqAffiliateId;
    if (!affiliateId) {
      if (subId) {
        const [userRows] = await db.execute(
          "SELECT custom_affiliate_id FROM users WHERE LOWER(username) = LOWER(?)",
          [subId]
        );
        if (userRows.length > 0 && userRows[0].custom_affiliate_id) {
          affiliateId = userRows[0].custom_affiliate_id;
        }
      }

      if (!affiliateId) {
        const settingKey = subId ? 'global_affiliate_id' : 'guest_affiliate_id';
        const [settings] = await db.execute(
          "SELECT setting_value FROM settings WHERE setting_key = ?",
          [settingKey]
        );
        affiliateId = settings[0]?.setting_value || '17399820370';
      }
    }

    const origin = process.env.BASE_URL || 'https://pishare.site';

    // 2. Xử lý trường hợp ĐƠN LẺ (link) -> tương thích ngược hoàn hảo
    if (link) {
      let finalUrl = link;
      try {
        finalUrl = await resolveShopeeShortLink(link);
      } catch (resolveErr) {
        console.warn('Lỗi phân giải link Shopee, sử dụng link gốc trực tiếp:', resolveErr);
      }

      if (finalUrl.includes('error_page')) {
        return NextResponse.json(
          { error: 'Đường dẫn Shopee này đã hết hạn hoặc không tồn tại.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      let longUrl;
      const isShortLink = finalUrl.includes('s.shopee.vn') || 
                          finalUrl.includes('shope.ee') || 
                          finalUrl.includes('shp.ee') || 
                          finalUrl.includes('vn.shp.ee');
                          
      if (isShortLink) {
        longUrl = finalUrl;
      } else {
        const encodedLink = encodeURIComponent(finalUrl);
        longUrl = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;
      }

      let code = '';
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        attempts++;
        code = generateRandomCode(8);
        if (RESERVED_WORDS.has(code.toLowerCase())) continue;

        const [rows] = await db.execute('SELECT id FROM short_links WHERE code = ?', [code]);
        if (rows.length === 0) isUnique = true;
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: 'Không thể khởi tạo mã rút gọn duy nhất' },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      await db.execute('INSERT INTO short_links (code, long_url) VALUES (?, ?)', [code, longUrl]);
      const shortUrl = `${origin}/${code}`;

      return NextResponse.json(
        { success: true, shortUrl, longUrl, code },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 3. XỬ LÝ HÀNG LOẠT (links array) -> SIÊU TỐI ƯU HIỆU NĂNG
    if (links && Array.isArray(links)) {
      // Giới hạn tối đa 30 link cho 1 request để tránh lạm dụng và quá tải server
      const targetLinks = links.slice(0, 30);
      const uniqueTargetLinks = Array.from(new Set(targetLinks)); // Loại bỏ trùng lặp trong mảng đầu vào

      const resolveLink = async (targetLink) => {
        let finalUrl = targetLink;
        try {
          finalUrl = await resolveShopeeShortLink(targetLink);
        } catch (resolveErr) {
          console.warn(`[Bulk API] Lỗi phân giải ${targetLink}, dùng trực tiếp:`, resolveErr.message);
        }
        return { original: targetLink, finalUrl };
      };

      // Chạy phân giải link đồng thời qua Promise.all
      const resolvedList = await Promise.all(uniqueTargetLinks.map(l => resolveLink(l)));

      const results = {};
      const insertData = [];

      for (const item of resolvedList) {
        // Nếu link chết, trả về link gốc ban đầu và không tạo link affiliate
        if (item.finalUrl.includes('error_page')) {
          results[item.original] = item.original;
          continue;
        }

        let longUrl;
        const isShortLink = item.finalUrl.includes('s.shopee.vn') || 
                            item.finalUrl.includes('shope.ee') || 
                            item.finalUrl.includes('shp.ee') || 
                            item.finalUrl.includes('vn.shp.ee');
                            
        if (isShortLink) {
          longUrl = item.finalUrl;
        } else {
          const encodedLink = encodeURIComponent(item.finalUrl);
          longUrl = `https://s.shopee.vn/an_redir?utm_medium=affiliates&affiliate_id=${affiliateId}&sub_id=${subId}&origin_link=${encodedLink}`;
        }

        // Sinh mã code 8 ký tự duy nhất
        let code = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
          attempts++;
          code = generateRandomCode(8);
          if (RESERVED_WORDS.has(code.toLowerCase())) continue;

          const [rows] = await db.execute('SELECT id FROM short_links WHERE code = ?', [code]);
          if (rows.length === 0) isUnique = true;
        }

        if (isUnique) {
          results[item.original] = `${origin}/${code}`;
          insertData.push([code, longUrl]);
        } else {
          // Fallback nếu trùng mã quá 10 lần (cực kỳ hiếm)
          results[item.original] = item.original;
        }
      }

      // Bulk INSERT một lần duy nhất vào cơ sở dữ liệu -> TIẾT KIỆM NĂNG LƯỢNG VÀ THỜI GIAN TRUY VẤN
      if (insertData.length > 0) {
        const placeholders = insertData.map(() => '(?, ?)').join(',');
        await db.execute(
          `INSERT INTO short_links (code, long_url) VALUES ${placeholders}`,
          insertData.flat()
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          results, 
          processedCount: uniqueTargetLinks.length, 
          savedCount: insertData.length 
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

  } catch (error) {
    console.error('Public shortener API error:', error);
    return NextResponse.json(
      { error: 'Lỗi xử lý server' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
