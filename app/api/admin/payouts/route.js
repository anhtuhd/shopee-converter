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

  const { searchParams } = new URL(request.url);
  const cutoffDate = searchParams.get('cutoffDate'); // YYYY-MM-DD

  if (!cutoffDate) {
    return NextResponse.json({ error: 'Thiếu ngày chốt (cutoffDate)' }, { status: 400 });
  }

  try {
    const db = await getConnection();
    
    // Group by user and sum user_commission for orders with status 'Hoàn thành' before cutoffDate
    // Also join with users table to get payment info
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.phone, 
        u.bank_qr, 
        u.commission_rate,
        SUM(o.user_commission) as total_payout,
        COUNT(o.id) as order_count
      FROM users u
      JOIN orders o ON u.username = o.sub_id1
      WHERE o.status = 'Hoàn thành' AND o.completed_time <= ?
      GROUP BY u.id
    `;

    const [rows] = await db.execute(query, [cutoffDate + ' 23:59:59']);

    return NextResponse.json({ payouts: rows });
  } catch (error) {
    console.error('Payouts fetch error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, cutoffDate } = await request.json();

    if (!username || !cutoffDate) {
      return NextResponse.json({ error: 'Thiếu thông tin username hoặc ngày chốt' }, { status: 400 });
    }

    const db = await getConnection();
    
    // Update all 'Hoàn thành' orders before cutoffDate for this user to 'Đã thanh toán'
    const [result] = await db.execute(
      "UPDATE orders SET status = 'Đã thanh toán' WHERE sub_id1 = ? AND status = 'Hoàn thành' AND completed_time <= ?",
      [username, cutoffDate + ' 23:59:59']
    );

    return NextResponse.json({ 
      message: `Đã cập nhật ${result.affectedRows} đơn hàng thành 'Đã thanh toán' cho user ${username}` 
    });
  } catch (error) {
    console.error('Payout mark paid error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
