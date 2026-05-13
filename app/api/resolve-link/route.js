import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getConnection } from '@/lib/db';

export async function POST(request) {
  try {
    const { link } = await request.json();

    if (!link) {
      return NextResponse.json({ error: 'Missing link' }, { status: 400 });
    }

    // Fetch global affiliate ID
    let globalAffiliateId = '17399820370'; // fallback
    try {
      const connection = await getConnection();
      const [rows] = await connection.execute("SELECT setting_value FROM settings WHERE setting_key = 'global_affiliate_id'");
      if (rows.length > 0) {
        globalAffiliateId = rows[0].setting_value;
      }
    } catch (dbErr) {
      console.error('Error fetching affiliate id from db:', dbErr);
    }

    // 1. Resolve shortlink to get the final URL using a normal User-Agent
    const initialRes = await fetch(link, { 
      method: 'GET', 
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const finalUrl = initialRes.url;

    // 2. Fetch HTML using a Bot User-Agent to get pre-rendered meta tags
    // Shopee serves a simple HTML with meta tags to social media bots
    const metaRes = await fetch(finalUrl, { 
      method: 'GET', 
      headers: {
        'User-Agent': 'facebookexternalhit/1.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8'
      }
    });

    const html = await metaRes.text();
    const $ = cheerio.load(html);

    // 3. Extract Metadata for Preview
    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || 'Sản phẩm Shopee',
      image: $('meta[property="og:image"]').attr('content') || '',
      description: $('meta[property="og:description"]').attr('content') || '',
      finalLink: finalUrl,
      affiliateId: globalAffiliateId
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Resolve link error:', error);
    return NextResponse.json({ error: 'Không thể phân tích link hoặc lấy thông tin sản phẩm.' }, { status: 500 });
  }
}
