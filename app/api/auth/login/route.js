import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';

function normalizeEmail(email) {
  if (!email) return '';
  const lowercase = email.trim().toLowerCase();
  if (lowercase.endsWith('@gmail.com')) {
    const parts = lowercase.split('@');
    let localPart = parts[0];
    if (localPart.includes('+')) {
      localPart = localPart.split('+')[0];
    }
    localPart = localPart.replace(/\./g, '');
    return `${localPart}@gmail.com`;
  }
  return lowercase;
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Tên đăng nhập/Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    const db = await getConnection();

    // Chuyển về chữ thường để cho phép đăng nhập không phân biệt chữ hoa, chữ thường
    const searchUsername = username.toLowerCase().trim();
    const searchEmail = normalizeEmail(username);

    // Find user by username OR email
    const [rows] = await db.execute(
      'SELECT id, username, password_hash, role, is_verified FROM users WHERE username = ? OR email = ?', 
      [searchUsername, searchEmail]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Sai tên đăng nhập/email hoặc mật khẩu' }, { status: 401 });
    }

    const user = rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Sai tên đăng nhập/email hoặc mật khẩu' }, { status: 401 });
    }

    // Kiểm tra trạng thái kích hoạt tài khoản
    if (!user.is_verified) {
      return NextResponse.json({ 
        error: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email của bạn để kích hoạt tài khoản.' 
      }, { status: 403 });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    const response = NextResponse.json({ message: 'Login successful', username: user.username }, { status: 200 });
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: `Lỗi đăng nhập (500): ${error.message || error.code || 'Lỗi không xác định'}`,
      details: error.stack 
    }, { status: 500 });
  }
}
