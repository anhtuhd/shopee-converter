import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';

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
      "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('global_affiliate_id', 'guest_affiliate_id')"
    );

    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    return NextResponse.json({
      global_affiliate_id: settings['global_affiliate_id'] || '17399820370',
      guest_affiliate_id: settings['guest_affiliate_id'] || '17399820370',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { global_affiliate_id, guest_affiliate_id } = await request.json();
    const db = await getConnection();

    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('global_affiliate_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [global_affiliate_id, global_affiliate_id]
    );
    await db.execute(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('guest_affiliate_id', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [guest_affiliate_id, guest_affiliate_id]
    );

    return NextResponse.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
