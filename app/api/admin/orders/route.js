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
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Filters
  const status = searchParams.get('status');
  const order_id = searchParams.get('order_id');
  const sub_id = searchParams.get('sub_id');
  const start_order_time = searchParams.get('start_order_time');
  const end_order_time = searchParams.get('end_order_time');
  const start_completed_time = searchParams.get('start_completed_time');
  const end_completed_time = searchParams.get('end_completed_time');

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }
  if (order_id) {
    whereClauses.push('order_id LIKE ?');
    params.push(`%${order_id}%`);
  }
  if (sub_id) {
    whereClauses.push('sub_id1 LIKE ?');
    params.push(`%${sub_id}%`);
  }
  if (start_order_time) {
    whereClauses.push('order_time >= ?');
    params.push(start_order_time + ' 00:00:00');
  }
  if (end_order_time) {
    whereClauses.push('order_time <= ?');
    params.push(end_order_time + ' 23:59:59');
  }
  if (start_completed_time) {
    whereClauses.push('completed_time >= ?');
    params.push(start_completed_time + ' 00:00:00');
  }
  if (end_completed_time) {
    whereClauses.push('completed_time <= ?');
    params.push(end_completed_time + ' 23:59:59');
  }

  let whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const db = await getConnection();
    
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereSQL}`;
    const [countRows] = await db.execute(countQuery, params);

    const selectQuery = `SELECT * FROM orders ${whereSQL} ORDER BY order_time DESC LIMIT ? OFFSET ?`;
    // We need to append the limit and offset to the parameters array. Since db.execute expects string params for limits if we pass them like this, let's cast them.
    const finalParams = [...params, limit.toString(), offset.toString()];
    
    const [rows] = await db.execute(selectQuery, finalParams);
    
    return NextResponse.json({
      orders: rows,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
