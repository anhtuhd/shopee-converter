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

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { orderIds } = await request.json(); // Array of DB `id`s
    
    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 });
    }

    const db = await getConnection();
    
    // Create placeholders for the IN clause
    const placeholders = orderIds.map(() => '?').join(',');
    
    await db.execute(
      `UPDATE orders SET status = 'Đã thanh toán' WHERE id IN (${placeholders})`,
      orderIds
    );

    return NextResponse.json({ message: `Đã thanh toán ${orderIds.length} đơn hàng` });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
