import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import { sendEmail } from '@/lib/email';

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
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu thông tin User ID' }, { status: 400 });
    }

    const db = await getConnection();
    const [users] = await db.execute(
      'SELECT id, username, email, full_name FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });
    }

    const user = users[0];
    const baseUrl = process.env.BASE_URL || 'https://pishare.site';
    const homeUrl = `${baseUrl}`;

    const { success } = await sendEmail({
      from: 'PiShare.site <noreply@pishare.site>',
      to: user.email,
      subject: '[PiShare.site] Hướng dẫn bắt đầu kiếm tiền và nhận hoa hồng cùng PiShare',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a73e8; font-size: 28px; margin: 0; font-weight: bold; letter-spacing: -0.5px;">PiShare.site</h1>
            <p style="color: #5f6368; font-size: 14px; margin: 4px 0 0 0;">Nền tảng tối ưu hóa hoa hồng Shopee Affiliate</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin-bottom: 24px;" />
          
          <p style="font-size: 16px; color: #2d3748; line-height: 1.6;">Xin chào <strong>${user.full_name || user.username}</strong>,</p>
          <p style="font-size: 15px; color: #4a5568; line-height: 1.6;">Chúc mừng bạn đã gia nhập cộng đồng kiếm tiền online cùng <strong>PiShare.site</strong>! Chúng tôi nhận thấy bạn vừa tạo tài khoản thành công nhưng chưa thực hiện chuyển đổi link Shopee nào để bắt đầu nhận hoa hồng.</p>
          <p style="font-size: 15px; color: #4a5568; line-height: 1.6;">Với PiShare, bạn có thể tự tạo link mua sắm để được hoàn tiền hoặc chia sẻ cho người khác mua để nhận hoa hồng cực kỳ đơn giản với 3 bước sau:</p>
          
          <div style="background-color: #f7fafc; border-left: 4px solid #1a73e8; border-radius: 4px; padding: 20px; margin: 24px 0;">
            <div style="margin-bottom: 16px;">
              <span style="background-color: #1a73e8; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; margin-right: 10px; font-size: 14px;">1</span>
              <strong style="color: #2d3748; font-size: 15px;">Đăng nhập tài khoản</strong>
              <p style="margin: 4px 0 0 34px; color: #718096; font-size: 14px;">Truy cập <a href="${homeUrl}/login" style="color: #1a73e8; text-decoration: none; font-weight: 500;">PiShare.site/login</a> và đăng nhập bằng tài khoản của bạn.</p>
            </div>
            
            <div style="margin-bottom: 16px;">
              <span style="background-color: #1a73e8; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; margin-right: 10px; font-size: 14px;">2</span>
              <strong style="color: #2d3748; font-size: 15px;">Chuyển đổi liên kết sản phẩm</strong>
              <p style="margin: 4px 0 0 34px; color: #718096; font-size: 14px;">Lấy bất kỳ đường link sản phẩm nào từ Shopee, dán vào ô chuyển đổi tại trang chủ để tạo link rút gọn cá nhân của bạn.</p>
            </div>
            
            <div style="margin: 0;">
              <span style="background-color: #1a73e8; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-block; text-align: center; line-height: 24px; font-weight: bold; margin-right: 10px; font-size: 14px;">3</span>
              <strong style="color: #2d3748; font-size: 15px;">Mua sắm & nhận hoa hồng</strong>
              <p style="margin: 4px 0 0 34px; color: #718096; font-size: 14px;">Tự mua qua link rút gọn đó để được hoàn tiền hoặc chia sẻ cho người khác mua. Hoa hồng sẽ được tự động cộng vào tài khoản và đối soát thanh toán định kỳ hàng tháng.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${homeUrl}" style="background-color: #1a73e8; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(26,115,232,0.3); transition: background-color 0.2s;">
              Bắt đầu kiếm tiền ngay
            </a>
          </div>
          
          <p style="font-size: 14px; color: #718096; line-height: 1.6; margin-bottom: 24px;">Nếu có bất kỳ thắc mắc hoặc cần hướng dẫn thêm, bạn có thể liên hệ trực tiếp với đội ngũ hỗ trợ của chúng tôi qua website.</p>
          
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 24px 0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">Đây là email tự động từ hệ thống PiShare.site. Vui lòng không trả lời trực tiếp email này.</p>
        </div>
      `
    });

    if (!success) {
      console.error('Welcome-back email send error: both SMTP and Resend failed');
      return NextResponse.json({ error: 'Không thể gửi email. Vui lòng thử lại sau.' }, { status: 500 });
    }

    return NextResponse.json({ message: `Đã gửi email nhắc nhở chào mừng thành công đến user ${user.username}` });

  } catch (error) {
    console.error('Remind welcome user error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
