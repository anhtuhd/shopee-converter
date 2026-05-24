import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });
    }

    const cleanEmail = email.trim();
    const db = await getConnection();

    // 1. Tìm user theo email
    const [users] = await db.execute(
      'SELECT id, username, is_verified FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'Email không tồn tại trong hệ thống' }, { status: 404 });
    }

    const user = users[0];

    // Nếu đã verified rồi thì không cho gửi lại
    if (user.is_verified === 1) {
      return NextResponse.json({ error: 'Tài khoản của bạn đã được kích hoạt từ trước.' }, { status: 400 });
    }

    // 2. Sinh mã OTP mới (6 chữ số) và thời gian hết hạn mới (10 phút sau)
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);
    
    const pad = (n) => String(n).padStart(2, '0');
    const mysqlExpiry = `${expiryDate.getFullYear()}-${pad(expiryDate.getMonth() + 1)}-${pad(expiryDate.getDate())} ${pad(expiryDate.getHours())}:${pad(expiryDate.getMinutes())}:${pad(expiryDate.getSeconds())}`;

    // 3. Cập nhật vào DB
    await db.execute(
      'UPDATE users SET verification_token = ?, verification_token_expiry = ? WHERE id = ?',
      [newOtp, mysqlExpiry, user.id]
    );

    console.log(`✔ Đã tạo lại OTP mới cho ${user.username}: ${newOtp}`);

    // 4. Gửi email chứa OTP mới (SMTP ưu tiên, Resend dự phòng)
    await sendEmail({
      from: 'Shopee Affiliate <noreply@pishare.site>',
      to: cleanEmail,
      subject: 'Mã xác thực OTP mới kích hoạt tài khoản - Shopee Affiliate',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a73e8; margin-top: 0;">Yêu cầu gửi lại mã OTP!</h2>
            </div>
            <p>Xin chào <strong>${user.username}</strong>,</p>
            <p>Chúng tôi nhận được yêu cầu gửi lại mã xác thực OTP kích hoạt tài khoản của bạn.</p>
            <p>Vui lòng nhập mã OTP mới dưới đây để hoàn tất kích hoạt. Mã này có hiệu lực trong vòng <strong>10 phút</strong>:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 6px; background-color: #f1f3f4; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                ${newOtp}
              </span>
            </div>
            <p style="text-align: center; color: #666; font-size: 13px;">Mã OTP có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo mật tài khoản.</p>
            <br/>
            <p>Nếu bạn không yêu cầu gửi lại mã, vui lòng bỏ qua email này.</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">Hệ thống PiShare.site - Hỗ trợ: anhtudh95@gmail.com - Zalo: 0397872462</p>
          </div>
        `
    });

    return NextResponse.json({ message: 'Mã OTP mới đã được gửi thành công. Vui lòng kiểm tra email.' }, { status: 200 });

  } catch (error) {
    console.error('Resend OTP route error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ trong quá trình gửi lại mã OTP.' }, { status: 500 });
  }
}
