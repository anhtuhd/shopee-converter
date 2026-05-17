import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải dài ít nhất 6 ký tự' }, { status: 400 });
    }

    const db = await getConnection();
    
    // Get current time in MySQL format (UTC/Local depending on server, we use Date object for safe comparison if driver supports it)
    // Actually, comparing dates in MySQL is safer via SQL directly:
    // WHERE reset_token = ? AND reset_token_expiry > NOW()
    // However, if the server and DB are in different timezones, NOW() might be different from Node's Date().
    // To be perfectly safe, we pass the current Node time to the query.
    
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [users] = await db.execute(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > ?',
      [token, now]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Đường dẫn khôi phục không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }

    const userId = users[0].id;

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, userId]
    );

    return NextResponse.json({ message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bây giờ.' }, { status: 200 });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
