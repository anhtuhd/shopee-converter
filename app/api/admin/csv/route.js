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

    // Lấy toàn bộ commission_rate của users 1 lần duy nhất
    const [userRows] = await db.execute('SELECT username, commission_rate FROM users');
    const userRates = {};
    userRows.forEach(u => { userRates[u.username] = parseFloat(u.commission_rate) || 0.50; });

    // Lấy toàn bộ order_id + item_id đã tồn tại — tránh N+1 query trong vòng lặp
    const [existingRows] = await db.execute('SELECT id, order_id, item_id FROM orders');
    const existingMap = new Map();
    existingRows.forEach(r => existingMap.set(`${r.order_id}__${r.item_id}`, r.id));

    const toInsert = [];
    const toUpdate = [];

    for (const record of finalRecords) {
      const order_id = record['ID đơn hàng'];
      if (!order_id) continue;

      const item_id        = record['Item id'] || '';
      const status         = record['Trạng thái đặt hàng'];
      const checkout_id    = record['Checkout id'];
      const order_time     = parseDate(record['Thời Gian Đặt Hàng']);
      const completed_time = parseDate(record['Thời gian hoàn thành']);
      const click_time     = parseDate(record['Thời gian Click']);
      const shop_name      = record['Tên Shop'];
      const shop_id        = record['Shop id'];
      const item_name      = record['Tên Item'];
      const product_type   = record['Loại sản phẩm'];
      const price          = parseFloat(record['Giá(₫)']) || 0;
      const quantity       = parseInt(record['Số lượng']) || 0;
      const order_value    = parseFloat(record['Giá trị đơn hàng (₫)']) || 0;
      const total_commission = parseFloat(record['Hoa hồng ròng tiếp thị liên kết(₫)']) || 0;
      const sub_id1 = record['Sub_id1'] || '';
      const sub_id2 = record['Sub_id2'] || '';
      const sub_id3 = record['Sub_id3'] || '';
      const sub_id4 = record['Sub_id4'] || '';
      const sub_id5 = record['Sub_id5'] || '';
      const channel = record['Kênh'] || '';

      const rate = userRates[sub_id1] || 0.50;
      const user_commission = total_commission * rate;

      const key = `${order_id}__${item_id}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        toUpdate.push([
          status, checkout_id, order_time, completed_time, click_time,
          shop_name, shop_id, item_name, product_type, price, quantity,
          order_value, total_commission, user_commission,
          sub_id1, sub_id2, sub_id3, sub_id4, sub_id5, channel,
          existingId
        ]);
      } else {
        toInsert.push([
          order_id, status, checkout_id, order_time, completed_time, click_time,
          shop_name, shop_id, item_id, item_name, product_type, price, quantity,
          order_value, total_commission, user_commission,
          sub_id1, sub_id2, sub_id3, sub_id4, sub_id5, channel
        ]);
      }
    }

    // Bulk INSERT — một câu query thay vì N câu query
    if (toInsert.length > 0) {
      const placeholders = toInsert.map(() =>
        '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).join(',');
      await db.execute(
        `INSERT INTO orders (
          order_id, status, checkout_id, order_time, completed_time, click_time,
          shop_name, shop_id, item_id, item_name, product_type, price, quantity,
          order_value, total_commission, user_commission,
          sub_id1, sub_id2, sub_id3, sub_id4, sub_id5, channel
        ) VALUES ${placeholders}`,
        toInsert.flat()
      );
    }

    // Bulk UPDATE — xử lý từng batch 50 record để tránh query quá lớn
    const BATCH_SIZE = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      for (const params of batch) {
        await db.execute(`
          UPDATE orders SET
            status=?, checkout_id=?, order_time=?, completed_time=?, click_time=?,
            shop_name=?, shop_id=?, item_name=?, product_type=?, price=?, quantity=?,
            order_value=?, total_commission=?, user_commission=?,
            sub_id1=?, sub_id2=?, sub_id3=?, sub_id4=?, sub_id5=?, channel=?
          WHERE id=?
        `, params);
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
