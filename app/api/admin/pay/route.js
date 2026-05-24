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
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { orderIds } = await request.json(); // Array of DB `id`s
    
    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ error: 'No orders selected' }, { status: 400 });
    }

    const db = await getConnection();
    
    // Create placeholders for the IN clause
    const placeholders = orderIds.map(() => '?').join(',');

    // 1. Truy vấn thông tin các user và số đơn hàng, tổng tiền nhận được tương ứng với danh sách orderIds
    const statsQuery = `
      SELECT 
        o.sub_id1 as username,
        u.email,
        u.full_name,
        COUNT(o.id) as orderCount,
        SUM(o.user_commission) as totalPayout
      FROM orders o
      LEFT JOIN users u ON o.sub_id1 = u.username
      WHERE o.id IN (${placeholders})
      GROUP BY o.sub_id1, u.email, u.full_name
    `;
    const [statsRows] = await db.execute(statsQuery, orderIds);
    
    // 2. Thực hiện cập nhật trạng thái đơn hàng thành 'Đã thanh toán'
    await db.execute(
      `UPDATE orders SET status = 'Đã thanh toán' WHERE id IN (${placeholders})`,
      orderIds
    );

    // 3. Gửi email cho từng user nhận được tiền thanh toán
    const baseUrl = process.env.BASE_URL || 'https://pishare.site';
    const historyUrl = `${baseUrl}/history`;

    for (const stats of statsRows) {
      if (stats.email && stats.totalPayout > 0) {
        try {
          await resend.emails.send({
            from: 'PiShare.site <noreply@pishare.site>',
            to: stats.email,
            subject: '[PiShare.site] Thông báo thanh toán hoa hồng thành công',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cce0ff; border-radius: 8px; padding: 24px; background-color: #ffffff;">
                <h2 style="color: #34a853; margin-bottom: 20px; text-align: center;">Thông Báo Thanh Toán Hoa Hồng Thành Công</h2>
                <p>Xin chào <strong>${stats.full_name || stats.username}</strong>,</p>
                <p>Hệ thống <strong>PiShare.site</strong> xin trân trọng thông báo: Các đơn hàng của bạn đã được đối soát và thanh toán hoa hồng thành công.</p>
                
                <div style="background-color: #f1f8e9; border: 1px solid #dcedc8; border-radius: 4px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: bold; color: #33691e;">Chi tiết đợt thanh toán:</p>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #5f6368;">Tài khoản nhận:</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right;">${stats.username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #5f6368;">Số lượng đơn hàng:</td>
                      <td style="padding: 6px 0; font-weight: bold; text-align: right;">${stats.orderCount} đơn</td>
                    </tr>
                    <tr style="border-top: 1px solid #e0e0e0;">
                      <td style="padding: 10px 0 0 0; color: #33691e; font-weight: bold; font-size: 16px;">Tổng số tiền nhận được:</td>
                      <td style="padding: 10px 0 0 0; font-weight: bold; color: #34a853; font-size: 20px; text-align: right;">${Number(stats.totalPayout).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  </table>
                </div>

                <p>Bạn có thể kiểm tra biến động số dư trong tài khoản ngân hàng của bạn và xem danh sách đơn hàng đã thanh toán tại mục <strong>Lịch sử đơn hàng</strong>.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${historyUrl}" style="background-color: #34a853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Xem Lịch sử đơn hàng
                  </a>
                </div>

                <p>Cảm ơn bạn đã luôn đồng hành cùng <strong>PiShare.site</strong>. Chúc bạn nhận thêm nhiều hoa hồng!</p>
                
                <hr style="border: 0; border-top: 1px solid #dfe1e5; margin: 30px 0;" />
                <p style="font-size: 12px; color: #9aa0a6; text-align: center; margin: 0;">Đây là email tự động từ hệ thống PiShare.site. Vui lòng không trả lời trực tiếp email này.</p>
              </div>
            `
          });
        } catch (emailErr) {
          console.error(`Failed to send email to ${stats.email}:`, emailErr);
        }
      }
    }

    return NextResponse.json({ message: `Đã thanh toán ${orderIds.length} đơn hàng và gửi email thông báo` });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
