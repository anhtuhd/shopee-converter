import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import { Resend } from 'resend';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_build');

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
      'SELECT id, username, email, full_name, phone, bank_qr FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User không tồn tại' }, { status: 404 });
    }

    const user = users[0];
    const missingInfo = [];
    if (!user.bank_qr) {
      missingInfo.push('<strong>Mã QR tài khoản ngân hàng</strong> (Cực kỳ quan trọng để nhận thanh toán tự động)');
    }
    if (!user.full_name) {
      missingInfo.push('<strong>Họ và tên</strong>');
    }
    if (!user.phone) {
      missingInfo.push('<strong>Số điện thoại liên hệ</strong>');
    }

    if (missingInfo.length === 0) {
      return NextResponse.json({ message: 'Thông tin user đã đầy đủ, không cần nhắc nhở.' }, { status: 400 });
    }

    const baseUrl = process.env.BASE_URL || 'https://pishare.site';
    const profileUrl = `${baseUrl}/profile`;

    const missingListHtml = missingInfo.map(item => `<li>${item}</li>`).join('');

    const { error } = await resend.emails.send({
      from: 'PiShare.site <noreply@pishare.site>',
      to: user.email,
      subject: '[PiShare.site] Nhắc nhở cập nhật thông tin cá nhân còn thiếu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cce0ff; border-radius: 8px; padding: 24px; background-color: #ffffff;">
          <h2 style="color: #ea4335; margin-bottom: 20px; text-align: center;">Nhắc Nhở Cập Nhật Thông Tin Cá Nhân</h2>
          <p>Xin chào <strong>${user.full_name || user.username}</strong>,</p>
          <p>Ban quản trị <strong>PiShare.site</strong> đã rà soát thông tin tài khoản của bạn và nhận thấy tài khoản của bạn hiện vẫn còn thiếu một số thông tin cá nhân cần thiết để thực hiện đối soát & thanh toán tự động.</p>
          
          <div style="background-color: #fcf8e3; border: 1px solid #fbeed5; border-radius: 4px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #c09853;">Các thông tin còn thiếu bao gồm:</p>
            <ul style="margin: 0; padding-left: 20px; color: #5f6368; line-height: 1.6;">
              ${missingListHtml}
            </ul>
          </div>

          <p>Để đảm bảo quyền lợi của bạn được ghi nhận đầy đủ, không bị gián đoạn khi nhận hoa hồng hoàn tiền vào ngày 15 hàng tháng, bạn vui lòng click vào nút bên dưới để truy cập trang cá nhân và cập nhật đầy đủ thông tin.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
              Cập nhật thông tin cá nhân ngay
            </a>
          </div>

          <p>Nếu nút bấm không hoạt động, bạn có thể sao chép liên kết sau và dán vào trình duyệt:</p>
          <p style="word-break: break-all; color: #1a73e8; font-size: 14px;">${profileUrl}</p>
          
          <hr style="border: 0; border-top: 1px solid #dfe1e5; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9aa0a6; text-align: center; margin: 0;">Đây là email tự động từ hệ thống PiShare.site. Vui lòng không trả lời trực tiếp email này.</p>
        </div>
      `
    });

    if (error) {
      console.error('Remind email send error:', error);
      return NextResponse.json({ error: 'Không thể gửi email. Vui lòng kiểm tra lại cấu hình Resend.' }, { status: 500 });
    }

    return NextResponse.json({ message: `Đã gửi email nhắc nhở thành công đến user ${user.username}` });

  } catch (error) {
    console.error('Remind user error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
