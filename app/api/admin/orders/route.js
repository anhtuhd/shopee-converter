import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';

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

export async function GET(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Filters
  const status = searchParams.get('status');
  const order_id = searchParams.get('order_id');
  const sub_id = searchParams.get('sub_id');
  const start_order_time = searchParams.get('start_order_time');
  const end_order_time = searchParams.get('end_order_time');
  const start_completed_time = searchParams.get('start_completed_time');
  const end_completed_time = searchParams.get('end_completed_time');

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('status = ?');
    params.push(status);
  }
  if (order_id) {
    whereClauses.push('order_id LIKE ?');
    params.push(`%${order_id}%`);
  }
  if (sub_id) {
    whereClauses.push('sub_id1 LIKE ?');
    params.push(`%${sub_id}%`);
  }
  if (start_order_time) {
    whereClauses.push('order_time >= ?');
    params.push(start_order_time + ' 00:00:00');
  }
  if (end_order_time) {
    whereClauses.push('order_time <= ?');
    params.push(end_order_time + ' 23:59:59');
  }
  if (start_completed_time) {
    whereClauses.push('completed_time >= ?');
    params.push(start_completed_time + ' 00:00:00');
  }
  if (end_completed_time) {
    whereClauses.push('completed_time <= ?');
    params.push(end_completed_time + ' 23:59:59');
  }

  let whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const db = await getConnection();
    
    const countQuery = `SELECT COUNT(*) as total FROM orders ${whereSQL}`;
    const [countRows] = await db.execute(countQuery, params);

    const selectQuery = `SELECT * FROM orders ${whereSQL} ORDER BY order_time DESC LIMIT ? OFFSET ?`;
    // We need to append the limit and offset to the parameters array. Since db.execute expects string params for limits if we pass them like this, let's cast them.
    const finalParams = [...params, limit.toString(), offset.toString()];
    
    const [rows] = await db.execute(selectQuery, finalParams);
    
    return NextResponse.json({
      orders: rows,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { orderId, username } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Thiếu mã đơn hàng (orderId)' }, { status: 400 });
    }

    const db = await getConnection();

    // Kiểm tra xem đơn hàng đã được gán user trước đó chưa (Chỉ cho phép thay đổi nếu đơn chưa xác định được user)
    const [existingCheck] = await db.execute('SELECT sub_id1 FROM orders WHERE order_id = ? LIMIT 1', [orderId]);
    if (existingCheck.length > 0 && existingCheck[0].sub_id1 && existingCheck[0].sub_id1.trim() !== '') {
      return NextResponse.json({ error: `Đơn hàng "${orderId}" đã được xác định/gán cho user "${existingCheck[0].sub_id1}" trước đó, không thể thay đổi.` }, { status: 400 });
    }

    // 1. Trường hợp hủy gán (username rỗng hoặc null)
    if (!username || username.trim() === '') {
      await db.execute(`
        UPDATE orders SET 
          sub_id1 = NULL,
          user_commission = 0,
          referrer_id = NULL,
          referrer_commission = 0,
          referrer_payout_status = 'Chưa thanh toán'
        WHERE order_id = ?
      `, [orderId]);
      
      return NextResponse.json({ message: 'Đã hủy gán đơn hàng thành công' });
    }

    // 2. Trường hợp gán đơn hàng cho user chỉ định
    // Tìm user
    const [userRows] = await db.execute('SELECT id, username, commission_rate FROM users WHERE username = ?', [username.trim()]);
    if (userRows.length === 0) {
      return NextResponse.json({ error: `Không tìm thấy user "${username}" trên hệ thống` }, { status: 404 });
    }
    const user = userRows[0];
    const userId = user.id;
    const userRate = parseFloat(user.commission_rate) || 0.50;

    // Lấy thông tin người giới thiệu (nếu có)
    const [refRows] = await db.execute(`
      SELECT r.referrer_id, r.referred_id, r.first_order_completed_at, u.username as referrer_username
      FROM referrals r
      JOIN users u ON r.referrer_id = u.id
      WHERE r.referred_id = ?
    `, [userId]);

    let referrerId = null;
    let referrerUsername = null;
    let referrerFirstOrderCompletedAt = null;
    if (refRows.length > 0) {
      referrerId = refRows[0].referrer_id;
      referrerUsername = refRows[0].referrer_username;
      referrerFirstOrderCompletedAt = refRows[0].first_order_completed_at;
    }

    // Lấy các đợt thưởng đặc biệt của user này
    const [bonusRows] = await db.execute(`
      SELECT bonus_rate, start_date, end_date 
      FROM special_bonuses 
      WHERE user_id = ?
    `, [userId]);
    const userSpecialBonuses = bonusRows.map(b => ({
      rate: parseFloat(b.bonus_rate),
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date)
    }));

    // Tính toán khoảng thời gian cộng thêm 5% cho người giới thiệu (nếu có)
    let referralBonusIntervals = [];
    if (referrerId) {
      const [allRefs] = await db.execute(`
        SELECT referred_id, first_order_completed_at 
        FROM referrals 
        WHERE referrer_id = ? AND first_order_completed_at IS NOT NULL
        ORDER BY first_order_completed_at ASC
      `, [referrerId]);

      if (allRefs.length > 0) {
        const dates = allRefs.map(r => new Date(r.first_order_completed_at));
        let currentInterval = null;
        dates.forEach(date => {
          if (!currentInterval) {
            currentInterval = {
              start: new Date(date),
              end: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000)
            };
          } else {
            if (date <= currentInterval.end) {
              currentInterval.end = new Date(currentInterval.end.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              referralBonusIntervals.push(currentInterval);
              currentInterval = {
                start: new Date(date),
                end: new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000)
              };
            }
          }
        });
        if (currentInterval) {
          referralBonusIntervals.push(currentInterval);
        }
      }
    }

    // Lấy các sản phẩm thuộc đơn hàng
    const [orderItems] = await db.execute('SELECT id, order_time, completed_time, total_commission, status FROM orders WHERE order_id = ?', [orderId]);
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy đơn hàng tương ứng' }, { status: 404 });
    }

    let firstOrderCompletedTime = null;

    for (const item of orderItems) {
      const totalComm = parseFloat(item.total_commission) || 0;
      let rate = userRate;

      // Check special bonus
      if (item.order_time && userSpecialBonuses.length > 0) {
        const orderDate = new Date(item.order_time);
        const activeBonus = userSpecialBonuses.find(b => orderDate >= b.startDate && orderDate <= b.endDate);
        if (activeBonus) {
          rate += activeBonus.rate;
        }
      }

      // Check referral bonus
      if (item.order_time && referralBonusIntervals.length > 0) {
        const orderDate = new Date(item.order_time);
        const isEligible = referralBonusIntervals.some(interval => orderDate >= interval.start && orderDate <= interval.end);
        if (isEligible) {
          rate += 0.05;
        }
      }

      const userComm = totalComm * rate;

      // Referrer commission
      let refId = null;
      let refComm = 0;
      let refPayoutStatus = 'Chưa thanh toán';

      if (referrerId) {
        refId = referrerId;
        refComm = userComm * 0.05;
        refPayoutStatus = 'Đang chờ';

        // Lấy ngày hoàn thành để kích hoạt bonus 30 ngày cho referrer nếu chưa có
        if (item.status === 'Hoàn thành' || item.status === 'Đã thanh toán') {
          if (!referrerFirstOrderCompletedAt && !firstOrderCompletedTime) {
            firstOrderCompletedTime = item.completed_time || item.order_time || new Date().toISOString().slice(0, 19).replace('T', ' ');
          }
        }
      }

      // Cập nhật từng item
      await db.execute(`
        UPDATE orders SET
          sub_id1 = ?,
          user_commission = ?,
          referrer_id = ?,
          referrer_commission = ?,
          referrer_payout_status = ?
        WHERE id = ?
      `, [user.username, userComm, refId, refComm, refPayoutStatus, item.id]);
    }

    // Cập nhật mốc kích hoạt đơn đầu cho cấp dưới nếu có
    if (referrerId && firstOrderCompletedTime && !referrerFirstOrderCompletedAt) {
      await db.execute(
        'UPDATE referrals SET first_order_completed_at = ? WHERE referred_id = ? AND first_order_completed_at IS NULL',
        [firstOrderCompletedTime, userId]
      );
    }

    return NextResponse.json({ message: `Đã gán đơn hàng "${orderId}" cho user "${user.username}" thành công.` });

  } catch (error) {
    console.error('Lỗi khi gán đơn hàng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
