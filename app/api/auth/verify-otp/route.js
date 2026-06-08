import { NextResponse } from 'next/server';
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
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email và mã OTP là bắt buộc' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanOtp = otp.trim();

    const db = await getConnection();

    // 1. Tìm user theo email
    const [users] = await db.execute(
      'SELECT id, username, role, is_verified, verification_token, verification_token_expiry FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Email không tồn tại trên hệ thống' }, { status: 404 });
    }

    const user = users[0];

    // Nếu tài khoản đã được kích hoạt từ trước, tiến hành tự động đăng nhập luôn
    if (user.is_verified === 1) {
      // Sinh JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = NextResponse.json({
        message: 'Tài khoản đã được kích hoạt. Đang đăng nhập...',
        username: user.username,
        verified: true
      }, { status: 200 });

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 ngày
      });

      return response;
    }

    // 2. Kiểm tra mã OTP khớp không
    if (user.verification_token !== cleanOtp) {
      return NextResponse.json({ error: 'Mã OTP không chính xác' }, { status: 400 });
    }

    // 3. Kiểm tra mã OTP hết hạn không
    const expiry = new Date(user.verification_token_expiry);
    if (expiry < new Date()) {
      return NextResponse.json({ error: 'Mã OTP đã hết hạn sử dụng. Vui lòng yêu cầu gửi lại mã mới.' }, { status: 400 });
    }

    // 4. Kích hoạt tài khoản thành công
    await db.execute(
      'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expiry = NULL WHERE id = ?',
      [user.id]
    );

    console.log(`✔ Kích hoạt tài khoản thành công via OTP: ${user.username} (${cleanEmail})`);

    // 5. Tự động đăng nhập người dùng ngay lập tức
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      message: 'Xác thực tài khoản và đăng nhập thành công!',
      username: user.username,
      verified: true
    }, { status: 200 });

    // Thiết lập cookie auth_token
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 ngày
    });

    return response;

  } catch (error) {
    console.error('Verify OTP route error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ trong quá trình xác thực OTP.' }, { status: 500 });
  }
}
