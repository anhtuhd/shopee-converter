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

export async function GET(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const cutoffDate = searchParams.get('cutoffDate'); // YYYY-MM-DD

  if (!cutoffDate) {
    return NextResponse.json({ error: 'Thiếu ngày chốt (cutoffDate)' }, { status: 400 });
  }

  try {
    const db = await getConnection();
    
    // Group by user and sum user_commission for orders with status 'Hoàn thành' before cutoffDate
    // Also join with users table to get payment info
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.full_name, 
        u.phone, 
        u.bank_qr, 
        u.commission_rate,
        SUM(o.user_commission) as total_payout,
        COUNT(o.id) as order_count
      FROM users u
      JOIN orders o ON LOWER(u.username) = LOWER(o.sub_id1)
      WHERE o.status = 'Hoàn thành' AND COALESCE(o.completed_time, o.order_time) <= ?
      GROUP BY u.id
    `;

    const [rows] = await db.execute(query, [cutoffDate + ' 23:59:59']);

    return NextResponse.json({ payouts: rows });
  } catch (error) {
    console.error('Payouts fetch error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, cutoffDate } = await request.json();

    if (!username || !cutoffDate) {
      return NextResponse.json({ error: 'Thiếu thông tin username hoặc ngày chốt' }, { status: 400 });
    }

    const db = await getConnection();
    
    // 1. Lấy thông tin email và full_name của user
    const [userRows] = await db.execute(
      "SELECT email, full_name FROM users WHERE username = ?",
      [username]
    );
    const user = userRows[0];

    // 2. Lấy thống kê số lượng đơn và tổng tiền trước khi update
    const [statsRows] = await db.execute(
      "SELECT COUNT(id) as orderCount, SUM(user_commission) as totalPayout FROM orders WHERE LOWER(sub_id1) = LOWER(?) AND status = 'Hoàn thành' AND COALESCE(completed_time, order_time) <= ?",
      [username, cutoffDate + ' 23:59:59']
    );
    const orderCount = statsRows[0]?.orderCount || 0;
    const totalPayout = statsRows[0]?.totalPayout || 0;

    // Update all 'Hoàn thành' orders before cutoffDate for this user to 'Đã thanh toán'
    const [result] = await db.execute(
      "UPDATE orders SET status = 'Đã thanh toán' WHERE LOWER(sub_id1) = LOWER(?) AND status = 'Hoàn thành' AND COALESCE(completed_time, order_time) <= ?",
      [username, cutoffDate + ' 23:59:59']
    );

    // 3. Nếu cập nhật thành công và user có email, thực hiện gửi thông báo
    if (result.affectedRows > 0 && user && user.email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const historyUrl = `${baseUrl}/history`;

        await resend.emails.send({
          from: 'PiShare.site <noreply@pishare.site>',
          to: user.email,
          subject: '[PiShare.site] Thông báo thanh toán hoa hồng thành công',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cce0ff; border-radius: 8px; padding: 24px; background-color: #ffffff;">
              <h2 style="color: #34a853; margin-bottom: 20px; text-align: center;">Thông Báo Thanh Toán Hoa Hồng Thành Công</h2>
              <p>Xin chào <strong>${user.full_name || username}</strong>,</p>
              <p>Hệ thống <strong>PiShare.site</strong> xin trân trọng thông báo: Yêu cầu thanh toán hoa hồng của bạn đã được đối soát và chuyển khoản thành công.</p>
              
              <div style="background-color: #f1f8e9; border: 1px solid #dcedc8; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #33691e;">Chi tiết đợt thanh toán:</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #5f6368;">Tài khoản nhận:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #5f6368;">Ngày chốt đối soát:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right;">${cutoffDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #5f6368;">Số lượng đơn hàng:</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right;">${orderCount} đơn</td>
                  </tr>
                  <tr style="border-top: 1px solid #e0e0e0;">
                    <td style="padding: 10px 0 0 0; color: #33691e; font-weight: bold; font-size: 16px;">Tổng số tiền chuyển khoản:</td>
                    <td style="padding: 10px 0 0 0; font-weight: bold; color: #34a853; font-size: 20px; text-align: right;">${Number(totalPayout).toLocaleString('vi-VN')} đ</td>
                  </tr>
                </table>
              </div>

              <p>Bạn có thể kiểm tra biến động số dư trong tài khoản ngân hàng đã đăng ký (hoặc mã QR ngân hàng của bạn) và đối chiếu danh sách đơn hàng đã được thanh toán tại mục <strong>Lịch sử đơn hàng</strong>.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${historyUrl}" style="background-color: #34a853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                  Xem Lịch sử đơn hàng
                </a>
              </div>

              <p>Cảm ơn bạn đã luôn đồng hành cùng <strong>PiShare.site</strong>. Chúc bạn tiếp tục gia tăng doanh số và nhận thêm nhiều hoa hồng!</p>
              
              <hr style="border: 0; border-top: 1px solid #dfe1e5; margin: 30px 0;" />
              <p style="font-size: 12px; color: #9aa0a6; text-align: center; margin: 0;">Đây là email tự động từ hệ thống PiShare.site. Vui lòng không trả lời trực tiếp email này.</p>
            </div>
          `
        });
      } catch (err) {
        console.error('Failed to send payout notification email:', err);
      }
    }

    return NextResponse.json({ 
      message: `Đã cập nhật ${result.affectedRows} đơn hàng thành 'Đã thanh toán' cho user ${username} và gửi mail thông báo` 
    });
  } catch (error) {
    console.error('Payout mark paid error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
