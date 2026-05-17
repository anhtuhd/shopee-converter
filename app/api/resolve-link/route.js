import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getConnection } from '@/lib/db';

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

    // 1. Resolve shortlink — timeout 10 giây để không treo tiến trình
    const controller1 = new AbortController();
    const t1 = setTimeout(() => controller1.abort(), 10000);
    const initialRes = await fetch(link, {
      method: 'GET',
      redirect: 'follow',
      signal: controller1.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(t1);

    const finalUrl = initialRes.url;

    // 2. Fetch HTML meta tags — timeout 10 giây
    const controller2 = new AbortController();
    const t2 = setTimeout(() => controller2.abort(), 10000);
    const metaRes = await fetch(finalUrl, {
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
