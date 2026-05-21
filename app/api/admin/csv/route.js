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

    // Lấy toàn bộ order_id + item_id + model_id đã tồn tại cùng trạng thái — tránh N+1 query trong vòng lặp
    const [existingRows] = await db.execute('SELECT id, order_id, item_id, model_id, status FROM orders');
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

      const rate = userRates[sub_id1] || 0.50;
      const user_commission = total_commission * rate;

      const key = `${order_id}__${item_id}__${model_id}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Nếu trạng thái trong DB đã là 'Đã thanh toán', bỏ qua không update bất kỳ thông tin nào
        if (existing.status === 'Đã thanh toán') {
          continue;
        }
        // Trường hợp trùng key, chỉ cập nhật trạng thái đơn hàng
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
        '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).join(',');
      await db.execute(
        `INSERT INTO orders (
          order_id, status, checkout_id, order_time, completed_time, click_time,
          shop_name, shop_id, item_id, model_id, item_name, product_type, price, quantity,
          order_value, total_commission, user_commission,
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

    return NextResponse.json({
      message: `Xử lý thành công. Thêm mới ${toInsert.length}, cập nhật ${toUpdate.length} đơn hàng.`
    });
  } catch (error) {
    console.error('CSV Parse error:', error);
    return NextResponse.json({ error: 'Lỗi trong quá trình xử lý file: ' + error.message }, { status: 500 });
  }
}
