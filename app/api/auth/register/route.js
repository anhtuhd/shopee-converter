import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getConnection } from '@/lib/db';

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateUsername(username) {
  const re = /^[a-z0-9]+$/;
  return re.test(username);
}

export async function POST(request) {
  try {
    let { username, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Định dạng email không hợp lệ' }, { status: 400 });
    }

    if (username) {
      if (!validateUsername(username)) {
        return NextResponse.json({ error: 'Tên đăng nhập chỉ được chứa chữ cái thường và số, không có ký tự đặc biệt' }, { status: 400 });
      }
    } else {
      // Auto-generate username
      username = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    const db = await getConnection();

    // Check if email exists
    const [emailRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (emailRows.length > 0) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    // Check if username exists
    const [userRows] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userRows.length > 0) {
      // If auto-generated username exists (very rare), or custom one exists
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    await db.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);

    return NextResponse.json({ message: 'Đăng ký thành công', username }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
