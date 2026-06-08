import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import cache from '@/lib/cache';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';

async function checkAdmin(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'admin') return decoded;
    return null;
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const db = await getConnection();
    const [rows] = await db.execute(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('global_affiliate_id', 'guest_affiliate_id', 'marquee_speed', 'marquee_speed_desktop', 'marquee_speed_mobile')"
    );

    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const legacySpeed = settings['marquee_speed'] || '12';

    return NextResponse.json({
      global_affiliate_id: settings['global_affiliate_id'] || '17399820370',
      guest_affiliate_id: settings['guest_affiliate_id'] || '17399820370',
      marquee_speed_desktop: settings['marquee_speed_desktop'] || legacySpeed,
      marquee_speed_mobile: settings['marquee_speed_mobile'] || Math.round(parseInt(legacySpeed, 10) * 0.7).toString() || '8',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { global_affiliate_id, guest_affiliate_id, marquee_speed_desktop, marquee_speed_mobile } = await request.json();
    const db = await getConnection();

    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('global_affiliate_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [global_affiliate_id, global_affiliate_id]
    );
    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('guest_affiliate_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [guest_affiliate_id, guest_affiliate_id]
    );
    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('marquee_speed_desktop', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [marquee_speed_desktop || '12', marquee_speed_desktop || '12']
    );
    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('marquee_speed_mobile', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [marquee_speed_mobile || '8', marquee_speed_mobile || '8']
    );

    cache.clear();

    return NextResponse.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
