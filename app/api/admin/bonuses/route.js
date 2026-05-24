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
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const db = await getConnection();
    const query = `
      SELECT 
        sb.id, 
        sb.user_id, 
        u.username, 
        sb.bonus_rate, 
        DATE_FORMAT(sb.start_date, '%Y-%m-%d %H:%i:%s') as start_date, 
        DATE_FORMAT(sb.end_date, '%Y-%m-%d %H:%i:%s') as end_date, 
        sb.description, 
        sb.created_at
      FROM special_bonuses sb
      JOIN users u ON sb.user_id = u.id
      ORDER BY sb.created_at DESC
    `;
    const [rows] = await db.execute(query);
    return NextResponse.json({ bonuses: rows });
  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, bonusRate, startDate, endDate, description } = await request.json();

    if (!userId || !bonusRate || !startDate || !endDate) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' }, { status: 400 });
    }

    const rate = parseFloat(bonusRate);
    if (isNaN(rate) || rate < 0 || rate > 10) {
      return NextResponse.json({ error: 'Tỷ lệ hoa hồng đặc biệt không hợp lệ (hợp lệ từ 0 đến 10, ví dụ 0.70 cho 70%)' }, { status: 400 });
    }

    const db = await getConnection();
    
    // Verify user exists
    const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'Thành viên không tồn tại' }, { status: 404 });
    }

    // Insert special bonus
    const insertQuery = `
      INSERT INTO special_bonuses (user_id, bonus_rate, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?)
    `;
    await db.execute(insertQuery, [userId, rate, startDate, endDate, description || '']);

    return NextResponse.json({ message: 'Tạo chương trình thưởng hoàn tiền đặc biệt thành công' });
  } catch (error) {
    console.error('Error creating bonus:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu mã chương trình thưởng' }, { status: 400 });
    }

    const db = await getConnection();
    await db.execute('DELETE FROM special_bonuses WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Xóa chương trình thưởng thành công' });
  } catch (error) {
    console.error('Error deleting bonus:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
