import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getConnection } from '@/lib/db';

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
      console.error('[Resolve Link Helper] Lỗi phân giải tại depth', depth, ':', err.message);
      break;
    }
  }

  return currentUrl;
}

// Hàm chuẩn hóa link Shopee để vượt qua bảo mật Cloudflare WAF
function standardizeShopeeUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 1. Dạng -i.shopId.itemId
    const matchI = pathname.match(/-i\.(\d+)\.(\d+)/);
    if (matchI) {
      return `https://shopee.vn/product/${matchI[1]}/${matchI[2]}`;
    }

    // 2. Dạng /product/shopId/itemId
    const matchProduct = pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (matchProduct) {
      return `https://shopee.vn/product/${matchProduct[1]}/${matchProduct[2]}`;
    }

    // 3. Dạng /anything/shopId/itemId
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const itemId = parts[parts.length - 1];
      const shopId = parts[parts.length - 2];
      if (/^\d+$/.test(shopId) && /^\d+$/.test(itemId)) {
        return `https://shopee.vn/product/${shopId}/${itemId}`;
      }
    }

    // Fallback: Xóa bỏ toàn bộ query parameters để tránh gây nghi ngờ cho Cloudflare
    urlObj.search = '';
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

export async function POST(request) {
  try {
    const { link } = await request.json();

    if (!link) {
      return NextResponse.json({ error: 'Missing link' }, { status: 400 });
    }

    // Fetch affiliate IDs from settings
    let globalAffiliateId = '17399820370'; // fallback for logged-in users
    let guestAffiliateId = '17399820370';  // fallback for guests
    try {
      const connection = await getConnection();
      const [rows] = await connection.execute(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('global_affiliate_id', 'guest_affiliate_id')"
      );
      rows.forEach(r => {
        if (r.setting_key === 'global_affiliate_id') globalAffiliateId = r.setting_value;
        if (r.setting_key === 'guest_affiliate_id') guestAffiliateId = r.setting_value;
      });
    } catch (dbErr) {
      console.error('Error fetching affiliate ids from db:', dbErr);
    }

    // 1. Phân giải link Shopee bằng hàm tối ưu mới
    const finalUrl = await resolveShopeeShortLink(link);

    // Kiểm tra nếu link đã hết hạn hoặc không tồn tại (Shopee redirect sang error_page)
    if (finalUrl.includes('error_page')) {
      return NextResponse.json(
        { error: 'Đường dẫn Shopee này đã hết hạn hoặc không tồn tại trên hệ thống Shopee.' },
        { status: 400 }
      );
    }

    // Chuẩn hóa link để vượt qua Cloudflare WAF
    const fetchUrl = standardizeShopeeUrl(finalUrl);

    // 2. Fetch HTML meta tags từ link đã chuẩn hóa sạch — timeout 10 giây
    const controller2 = new AbortController();
    const t2 = setTimeout(() => controller2.abort(), 10000);
    const metaRes = await fetch(fetchUrl, {
      method: 'GET',
      signal: controller2.signal,
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
      }
    });
    clearTimeout(t2);

    const html = await metaRes.text();
    const $ = cheerio.load(html);

    // 3. Extract Metadata for Preview
    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || 'Sản phẩm Shopee',
      image: $('meta[property="og:image"]').attr('content') || '',
      description: $('meta[property="og:description"]').attr('content') || '',
      finalLink: finalUrl,
      affiliateId: globalAffiliateId,       // Dành cho user đã đăng nhập
      guestAffiliateId: guestAffiliateId,   // Dành cho user chưa đăng nhập
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Resolve link error:', error);
    return NextResponse.json({ error: 'Không thể phân tích link hoặc lấy thông tin sản phẩm.' }, { status: 500 });
  }
}
