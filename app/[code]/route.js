import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(request, context) {
  try {
    // Tương thích với Next.js 15+ bằng cách await params
    const params = await context.params;
    const code = params?.code;

    if (!code) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const db = await getConnection();
    const [rows] = await db.execute('SELECT long_url FROM short_links WHERE code = ?', [code]);

    if (rows.length > 0) {
      const longUrl = rows[0].long_url;
      // Chuyển hướng 302 đến Shopee Affiliate link dài
      return NextResponse.redirect(new URL(longUrl));
    } else {
      // Nếu không tìm thấy, chuyển hướng về trang chủ kèm lỗi
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(`${origin}/?error=link_not_found`);
    }

  } catch (error) {
    console.error('Redirection error:', error);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/?error=server_error`);
  }
}
