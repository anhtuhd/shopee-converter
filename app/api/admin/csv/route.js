import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getConnection } from '@/lib/db';
import { parse } from 'csv-parse/sync';

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

function parseDate(str) {
  if (!str || str.trim() === '' || str.trim() === '--') return null;
  return str.trim();
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('csv_file');

    if (!file || typeof file === 'string' || !file.name) {
      return NextResponse.json({ error: 'Không tìm thấy file CSV' }, { status: 400 });
    }

    const text = await file.text();
    let finalRecords = [];
    try {
      finalRecords = parse(text, {
        columns: true, skip_empty_lines: true, delimiter: '\t',
        trim: true, relax_quotes: true, relax_column_count: true
      });
      if (finalRecords.length > 0 && !finalRecords[0]['ID đơn hàng']) throw new Error('Wrong delimiter');
    } catch (e) {
      try {
        finalRecords = parse(text, {
          columns: true, skip_empty_lines: true, delimiter: ',',
          trim: true, relax_quotes: true, relax_column_count: true
        });
      } catch (err2) {
        return NextResponse.json({ error: 'Lỗi parse file CSV: ' + err2.message }, { status: 400 });
      }
    }

    if (finalRecords.length === 0 || !finalRecords[0]['ID đơn hàng']) {
      return NextResponse.json({ error: 'Sai định dạng file CSV. Không tìm thấy cột "ID đơn hàng"' }, { status: 400 });
    }

    const db = await getConnection();

    // Lấy toàn bộ commission_rate của users 1 lần duy nhất (phục vụ đối chiếu chữ thường)
    const [userRows] = await db.execute('SELECT username, commission_rate FROM users');
    const userRates = {};
    userRows.forEach(u => { userRates[u.username.toLowerCase()] = parseFloat(u.commission_rate) || 0.50; });

    // Lấy toàn bộ special_bonuses để đối chiếu hoa hồng thưởng đặc biệt theo thời gian
    const [bonusRows] = await db.execute(`
      SELECT u.username, sb.bonus_rate, sb.start_date, sb.end_date 
      FROM special_bonuses sb
      JOIN users u ON sb.user_id = u.id
    `);
    const userBonuses = {};
    bonusRows.forEach(b => {
      const username = b.username.toLowerCase();
      if (!userBonuses[username]) {
        userBonuses[username] = [];
      }
      userBonuses[username].push({
        rate: parseFloat(b.bonus_rate),
        startDate: new Date(b.start_date),
        endDate: new Date(b.end_date)
      });
    });

    // Lấy toàn bộ mối liên kết referral để đối chiếu nhanh
    const [referralRows] = await db.execute(`
      SELECT 
        r.referrer_id, 
        r.referred_id, 
        LOWER(u_referred.username) as referred_username, 
        LOWER(u_referrer.username) as referrer_username,
        r.first_order_completed_at
      FROM referrals r
      JOIN users u_referred ON r.referred_id = u_referred.id
      JOIN users u_referrer ON r.referrer_id = u_referrer.id
    `);
    const referralMap = {}; // referred_username -> { referrerId, referredId, referrerUsername, firstOrderCompletedAt }
    referralRows.forEach(ref => {
      referralMap[ref.referred_username] = {
        referrerId: ref.referrer_id,
        referredId: ref.referred_id,
        referrerUsername: ref.referrer_username,
        firstOrderCompletedAt: ref.first_order_completed_at
      };
    });

    // Lấy toàn bộ khoảng thời gian được cộng bonus 5% của tất cả người giới thiệu
    const referralBonusIntervals = {}; // referrer_username -> [ { start, end } ]
    referralRows.forEach(ref => {
      if (ref.first_order_completed_at) {
        const username = ref.referrer_username;
        if (!referralBonusIntervals[username]) {
          referralBonusIntervals[username] = [];
        }
        const start = new Date(ref.first_order_completed_at);
        const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 ngày sau
        referralBonusIntervals[username].push({ start, end });
      }
    });

    // Đối tượng ghi nhận các mốc ngày hoàn thành đơn đầu tiên của cấp dưới cần cập nhật sau vòng lặp
    const referralFirstOrderUpdates = {}; // referred_id -> completed_time_string

    // Lấy danh sách order_id duy nhất từ CSV để query chọn lọc, tránh tải toàn bộ bảng vào RAM (OOM)
    const orderIds = Array.from(new Set(finalRecords.map(r => r['ID đơn hàng']).filter(Boolean)));
    let existingRows = [];
    
    if (orderIds.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        const [rows] = await db.execute(
          `SELECT id, order_id, item_id, model_id, status FROM orders WHERE order_id IN (${placeholders})`,
          batch
        );
        existingRows = existingRows.concat(rows);
      }
    }

    const existingMap = new Map();
    existingRows.forEach(r => existingMap.set(`${r.order_id}__${r.item_id}__${r.model_id || ''}`, { id: r.id, status: r.status }));

    const toInsertMap = new Map();
    const toUpdateMap = new Map();

    for (const record of finalRecords) {
      const order_id = record['ID đơn hàng'];
      if (!order_id) continue;

      const item_id        = record['Item id'] || '';
      const model_id        = record['ID Model'] || '';
      const status         = record['Trạng thái đặt hàng'] || '';
      const checkout_id    = record['Checkout id'] || null;
      const order_time     = parseDate(record['Thời Gian Đặt Hàng']) || null;
      const completed_time = parseDate(record['Thời gian hoàn thành']) || null;
      const click_time     = parseDate(record['Thời gian Click']) || null;
      const shop_name      = record['Tên Shop'] || null;
      const shop_id        = record['Shop id'] || null;
      const item_name      = record['Tên Item'] || null;
      const product_type   = record['Loại sản phẩm'] || null;
      const price          = parseFloat(record['Giá(₫)']) || 0;
      const quantity       = parseInt(record['Số lượng']) || 0;
      const order_value    = parseFloat(record['Giá trị đơn hàng (₫)']) || 0;
      const total_commission = parseFloat(record['Tổng hoa hồng sản phẩm(₫)']) || 0;
      const sub_id1 = record['Sub_id1'] || '';
      const sub_id2 = record['Sub_id2'] || null;
      const sub_id3 = record['Sub_id3'] || null;
      const sub_id4 = record['Sub_id4'] || null;
      const sub_id5 = record['Sub_id5'] || null;
      const channel = record['Kênh'] || null;

      const lowerSub1 = sub_id1 ? sub_id1.toLowerCase() : '';
      let rate = userRates[lowerSub1] || 0.50;

      // 1. Áp dụng thưởng đặc biệt Admin set nếu khớp khoảng thời gian order_time
      if (lowerSub1 && order_time && userBonuses[lowerSub1]) {
        const orderDate = new Date(order_time);
        const activeBonus = userBonuses[lowerSub1].find(b => orderDate >= b.startDate && orderDate <= b.endDate);
        if (activeBonus) {
          rate = activeBonus.rate;
        }
      }

      // 2. Áp dụng tăng 5% hoa hồng cá nhân nếu nằm trong thời hạn bonus 30 ngày của bất kỳ cấp dưới nào
      if (lowerSub1 && order_time && referralBonusIntervals[lowerSub1]) {
        const orderDate = new Date(order_time);
        const isEligibleForReferralBonus = referralBonusIntervals[lowerSub1].some(
          interval => orderDate >= interval.start && orderDate <= interval.end
        );
        if (isEligibleForReferralBonus) {
          rate += 0.05; // Tăng thêm 5%
        }
      }

      const user_commission = total_commission * rate;

      // 3. Tính toán hoa hồng thưởng giới thiệu cho Người giới thiệu (5% từ hoa hồng của cấp dưới)
      let referrer_id = null;
      let referrer_commission = 0;
      let referrer_payout_status = 'Chưa thanh toán';

      if (lowerSub1 && referralMap[lowerSub1]) {
        const refInfo = referralMap[lowerSub1];
        referrer_id = refInfo.referrerId;
        referrer_commission = user_commission * 0.05; // 5% hoa hồng của B thưởng cho A
        referrer_payout_status = 'Đang chờ'; // Đang chờ thanh toán hoa hồng giới thiệu

        // Ghi nhận ngày hoàn thành đơn hàng đầu tiên của B để kích hoạt 30 ngày bonus cho A
        if (status === 'Hoàn thành' || status === 'Đã thanh toán') {
          if (!refInfo.firstOrderCompletedAt && !referralFirstOrderUpdates[refInfo.referredId]) {
            const completedTimeStr = completed_time || order_time || new Date().toISOString().slice(0, 19).replace('T', ' ');
            referralFirstOrderUpdates[refInfo.referredId] = completedTimeStr;
            refInfo.firstOrderCompletedAt = completedTimeStr; // Cập nhật cache để tránh trùng lặp
          }
        }
      }

      const key = `${order_id}__${item_id}__${model_id}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Nếu trạng thái trong DB đã là 'Đã thanh toán', bỏ qua không update bất kỳ thông tin nào
        if (existing.status === 'Đã thanh toán') {
          continue;
        }

        // Trường hợp trùng key nhưng cập nhật trạng thái mới
        if (lowerSub1 && referralMap[lowerSub1]) {
          const refInfo = referralMap[lowerSub1];
          if (status === 'Hoàn thành' || status === 'Đã thanh toán') {
            if (!refInfo.firstOrderCompletedAt && !referralFirstOrderUpdates[refInfo.referredId]) {
              const completedTimeStr = completed_time || order_time || new Date().toISOString().slice(0, 19).replace('T', ' ');
              referralFirstOrderUpdates[refInfo.referredId] = completedTimeStr;
              refInfo.firstOrderCompletedAt = completedTimeStr; // Cập nhật cache
            }
          }
        }

        toUpdateMap.set(existing.id, status);
      } else {
        // Nếu trùng key ngay trong cùng một file upload, chỉ cập nhật trạng thái
        if (toInsertMap.has(key)) {
          const insertRow = toInsertMap.get(key);
          insertRow[1] = status; // Vị trí 1 tương ứng với cột status trong mảng insert
        } else {
          toInsertMap.set(key, [
            order_id, status, checkout_id, order_time, completed_time, click_time,
            shop_name, shop_id, item_id, model_id, item_name, product_type, price, quantity,
            order_value, total_commission, user_commission,
            referrer_id, referrer_commission, referrer_payout_status,
            sub_id1, sub_id2, sub_id3, sub_id4, sub_id5, channel
          ]);
        }
      }
    }

    const toInsert = Array.from(toInsertMap.values());
    const toUpdate = Array.from(toUpdateMap.entries());

    // Bulk INSERT — một câu query thay vì N câu query
    if (toInsert.length > 0) {
      const placeholders = toInsert.map(() =>
        '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).join(',');
      await db.execute(
        `INSERT INTO orders (
          order_id, status, checkout_id, order_time, completed_time, click_time,
          shop_name, shop_id, item_id, model_id, item_name, product_type, price, quantity,
          order_value, total_commission, user_commission,
          referrer_id, referrer_commission, referrer_payout_status,
          sub_id1, sub_id2, sub_id3, sub_id4, sub_id5, channel
        ) VALUES ${placeholders}`,
        toInsert.flat()
      );
    }

    // Bulk UPDATE — chỉ cập nhật cột status cho các đơn trùng key (trừ đã thanh toán)
    const BATCH_SIZE = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      for (const [id, status] of batch) {
        await db.execute(`
          UPDATE orders SET status = ? WHERE id = ?
        `, [status, id]);
      }
    }

    // Thực hiện cập nhật mốc thời gian hoàn thành đơn hàng đầu tiên của cấp dưới vào bảng referrals
    const referralUpdateEntries = Object.entries(referralFirstOrderUpdates);
    if (referralUpdateEntries.length > 0) {
      for (const [referredId, completedTimeStr] of referralUpdateEntries) {
        await db.execute(
          'UPDATE referrals SET first_order_completed_at = ? WHERE referred_id = ? AND first_order_completed_at IS NULL',
          [completedTimeStr, referredId]
        );
        console.log(`✔ Đã cập nhật first_order_completed_at cho User ID ${referredId} là ${completedTimeStr}`);
      }
    }

    return NextResponse.json({
      message: `Xử lý thành công. Thêm mới ${toInsert.length}, cập nhật ${toUpdate.length} đơn hàng.`
    });
  } catch (error) {
    console.error('CSV Parse error:', error);
    return NextResponse.json({ error: 'Lỗi trong quá trình xử lý file: ' + error.message }, { status: 500 });
  }
}
