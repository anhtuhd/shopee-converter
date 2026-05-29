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
        sb.marquee_text,
        sb.show_for_guests,
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
    const { userId, userIds, bonusRate, startDate, endDate, description, marqueeText, showForGuests, autoApply } = await request.json();

    if ((!userId && !userIds && !showForGuests) || bonusRate === undefined || bonusRate === null || bonusRate === '' || !startDate || !endDate) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' }, { status: 400 });
    }

    const rate = parseFloat(bonusRate);
    if (isNaN(rate) || rate < -0.5 || rate > 0.5) {
      return NextResponse.json({ error: 'Tỷ lệ hoa hồng đặc biệt không hợp lệ (hợp lệ từ -0.5 đến 0.5, ví dụ -0.15 cho -15%, 0.20 cho 20%)' }, { status: 400 });
    }

    const db = await getConnection();
    const adminUser = await checkAdmin(request);
    
    // Determine the list of target user IDs
    let targetUserIds = [];
    if (userIds === 'all' || userId === 'all') {
      const [allUsers] = await db.execute("SELECT id FROM users");
      targetUserIds = allUsers.map(u => u.id);
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds.map(id => parseInt(id)).filter(id => !isNaN(id));
    } else if (userId) {
      targetUserIds = [parseInt(userId)];
    } else if (showForGuests && adminUser) {
      targetUserIds = [adminUser.userId];
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'Không có thành viên nào được chọn hợp lệ' }, { status: 400 });
    }

    // Convert date-only YYYY-MM-DD values to full datetimes
    let finalStartDate = startDate;
    let finalEndDate = endDate;
    if (startDate && startDate.length === 10) {
      finalStartDate = `${startDate} 00:00:00`;
    }
    if (endDate && endDate.length === 10) {
      finalEndDate = `${endDate} 23:59:59`;
    }

    // Insert special bonus for each target user
    const insertQuery = `
      INSERT INTO special_bonuses (user_id, bonus_rate, start_date, end_date, description, marquee_text, show_for_guests)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    for (const uid of targetUserIds) {
      await db.execute(insertQuery, [uid, rate, finalStartDate, finalEndDate, description || '', marqueeText || '', showForGuests ? 1 : 0]);
    }

    // Save to global settings if autoApply is enabled
    if (autoApply) {
      const saveSetting = async (key, val) => {
        await db.execute(
          "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
          [key, val]
        );
      };
      await saveSetting('auto_bonus_active', '1');
      await saveSetting('auto_bonus_rate', rate.toString());
      await saveSetting('auto_bonus_start', finalStartDate);
      await saveSetting('auto_bonus_end', finalEndDate);
      await saveSetting('auto_bonus_desc', description || '');
      await saveSetting('auto_bonus_marquee', marqueeText || '');
      await saveSetting('auto_bonus_show_for_guests', showForGuests ? '1' : '0');
    } else {
      await db.execute(
        "INSERT INTO settings (setting_key, setting_value) VALUES ('auto_bonus_active', '0') ON DUPLICATE KEY UPDATE setting_value = '0'"
      );
    }

    return NextResponse.json({ message: `Tạo chương trình thưởng hoàn tiền đặc biệt thành công cho ${targetUserIds.length} thành viên.` });
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
