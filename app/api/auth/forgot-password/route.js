import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import crypto from 'crypto';
import { Resend } from 'resend';

// Khởi tạo Resend một lần duy nhất khi module load (không tạo lại mỗi request)
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email không được để trống' }, { status: 400 });
    }

    const db = await getConnection();
    const [users] = await db.execute('SELECT id, username FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'Email không tồn tại trong hệ thống' }, { status: 404 });
    }

    const user = users[0];

    // Generate token (32 random bytes, hex encoded)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Token expires in 5 minutes
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 5);
    const mysqlExpiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [resetToken, mysqlExpiry, email]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Gửi email bằng Resend
    const { error } = await resend.emails.send({
      from: 'Shopee Affiliate <onboarding@resend.dev>',
      to: email,
      subject: 'Khôi phục mật khẩu - Shopee Affiliate',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Xin chào ${user.username},</h2>
          <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
          <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu mới. Đường link này chỉ có hiệu lực trong vòng <strong>5 phút</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #ea4335; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p>Nếu nút bấm không hoạt động, bạn có thể copy và dán đường link sau vào trình duyệt:</p>
          <p style="word-break: break-all; color: #1a73e8;">${resetUrl}</p>
          <br/>
          <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Hệ thống chuyển đổi link Shopee Affiliate</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình Resend.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Vui lòng kiểm tra email để lấy đường dẫn khôi phục mật khẩu.' }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
