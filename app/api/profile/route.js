import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import { v2 as cloudinary } from 'cloudinary';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';

// Cloudinary Configuration (khởi tạo một lần duy nhất khi module load)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function getUserFromToken(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  const decoded = await getUserFromToken(request);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = await getConnection();
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, phone, bank_qr, role, commission_rate, custom_affiliate_id, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Kiểm tra xem user có đang trong thời gian hưởng bonus 5% hoa hồng cá nhân (Commission Boost) không - Cộng dồn tích lũy
    const [referralsWithFirstOrder] = await db.execute(`
      SELECT first_order_completed_at 
      FROM referrals 
      WHERE referrer_id = ? 
        AND first_order_completed_at IS NOT NULL 
      ORDER BY first_order_completed_at ASC
    `, [decoded.userId]);

    let bonusExpiryDate = null;
    for (const ref of referralsWithFirstOrder) {
      const completionDate = new Date(ref.first_order_completed_at);
      if (bonusExpiryDate === null) {
        // Lần đầu: bắt đầu từ ngày hoàn thành đơn đầu và kéo dài 30 ngày
        bonusExpiryDate = new Date(completionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        if (completionDate <= bonusExpiryDate) {
          // Hoàn thành đơn hàng khi đang trong hạn bonus -> Cộng dồn thêm 30 ngày vào hạn cũ
          bonusExpiryDate = new Date(bonusExpiryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          // Hoàn thành đơn hàng sau khi hết hạn -> Bắt đầu chu kỳ 30 ngày mới từ ngày hoàn thành đơn này
          bonusExpiryDate = new Date(completionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }
    }

    const hasActiveBonus = bonusExpiryDate !== null && new Date() <= bonusExpiryDate;
    
    // Tạo bản copy của thông tin user và cập nhật commission_rate nếu có bonus
    const userProfile = { ...users[0] };
    userProfile.referral_bonus_expiry = bonusExpiryDate ? bonusExpiryDate.toISOString() : null;
    if (hasActiveBonus) {
      userProfile.commission_rate = parseFloat(userProfile.commission_rate) + 0.05;
      userProfile.has_referral_bonus = true;
    } else {
      userProfile.has_referral_bonus = false;
    }

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE sub_id1 = ? ORDER BY order_time DESC',
      [users[0].username]
    );

    // 1. Thống kê số lượng người đã giới thiệu
    const [refCountRows] = await db.execute(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?',
      [decoded.userId]
    );
    const referredCount = refCountRows[0]?.count || 0;

    // 2. Lấy danh sách những người được giới thiệu
    const [referredUsers] = await db.execute(`
      SELECT u.id, u.username, u.full_name, r.first_order_completed_at, r.created_at 
      FROM referrals r 
      JOIN users u ON r.referred_id = u.id 
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
    `, [decoded.userId]);

    // 3. Tính tổng tiền thưởng giới thiệu nhận được (đã thanh toán hoặc hoàn thành)
    const [earningsRows] = await db.execute(
      "SELECT SUM(referrer_commission) as total FROM orders WHERE referrer_id = ? AND status IN ('Hoàn thành', 'Đã thanh toán')",
      [decoded.userId]
    );
    const referralEarnings = parseFloat(earningsRows[0]?.total || 0);

    // 4. Lấy danh sách đơn hàng thụ động được nhận hoa hồng giới thiệu
    const [referralOrders] = await db.execute(`
      SELECT o.id, o.order_id, o.status, o.order_time, o.total_commission, o.referrer_commission, o.sub_id1 as purchaser, o.referrer_payout_status
      FROM orders o
      WHERE o.referrer_id = ?
      ORDER BY o.order_time DESC
      LIMIT 100
    `, [decoded.userId]);

    // 5. Tính toán số dư đang chờ thanh toán (bao gồm hoa hồng cá nhân 'Hoàn thành' + hoa hồng giới thiệu 'Đang chờ')
    const [pendingPersonalRows] = await db.execute(
      "SELECT SUM(user_commission) as total FROM orders WHERE sub_id1 = ? AND status = 'Hoàn thành'",
      [users[0].username]
    );
    const [pendingReferralRows] = await db.execute(
      "SELECT SUM(referrer_commission) as total FROM orders WHERE referrer_id = ? AND status IN ('Hoàn thành', 'Đã thanh toán') AND referrer_payout_status = 'Đang chờ'",
      [decoded.userId]
    );
    const pendingPersonal = parseFloat(pendingPersonalRows[0]?.total || 0);
    const pendingReferral = parseFloat(pendingReferralRows[0]?.total || 0);
    const pendingPayout = pendingPersonal + pendingReferral;

    // 6. Tính toán số dư đã nhận/thanh toán (bao gồm hoa hồng cá nhân 'Đã thanh toán' + hoa hồng giới thiệu 'Đã thanh toán')
    const [paidPersonalRows] = await db.execute(
      "SELECT SUM(user_commission) as total FROM orders WHERE sub_id1 = ? AND status = 'Đã thanh toán'",
      [users[0].username]
    );
    const [paidReferralRows] = await db.execute(
      "SELECT SUM(referrer_commission) as total FROM orders WHERE referrer_id = ? AND referrer_payout_status = 'Đã thanh toán'",
      [decoded.userId]
    );
    const paidPersonal = parseFloat(paidPersonalRows[0]?.total || 0);
    const paidReferral = parseFloat(paidReferralRows[0]?.total || 0);
    const paidPayout = paidPersonal + paidReferral;

    return NextResponse.json({ 
      user: userProfile, 
      orders, 
      referral: { 
        referredCount, 
        referredUsers, 
        referralEarnings, 
        referralOrders,
        pendingPayout,
        paidPayout,
        pendingPersonal,
        pendingReferral,
        paidPersonal,
        paidReferral
      } 
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request) {
  const decoded = await getUserFromToken(request);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const full_name = formData.get('full_name') || '';
    const phone = formData.get('phone') || '';
    const file = formData.get('bank_qr');
    let bank_qr_path = formData.get('existing_bank_qr') || '';

    // Upload ảnh QR lên Cloudinary
    if (file && typeof file !== 'string' && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      try {
        const uploadResponse = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({
            resource_type: 'auto',
            folder: 'shopee_affiliate/qrcodes',
          }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }).end(buffer);
        });

        bank_qr_path = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary Upload Error:', uploadError);
        return NextResponse.json({ error: 'Lỗi khi upload ảnh lên Cloudinary' }, { status: 500 });
      }
    }

    const db = await getConnection();
    await db.execute(
      'UPDATE users SET full_name = ?, phone = ?, bank_qr = ? WHERE id = ?',
      [full_name, phone, bank_qr_path, decoded.userId]
    );

    return NextResponse.json({ message: 'Cập nhật thành công', bank_qr: bank_qr_path }, { status: 200 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Lỗi khi cập nhật profile' }, { status: 500 });
  }
}
