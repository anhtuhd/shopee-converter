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
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate và endDate là bắt buộc' }, { status: 400 });
  }

  try {
    const db = await getConnection();

    // 1. Lấy KPIs từ đơn hàng Shopee
    const [orderKpiRows] = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(order_value), 0) as total_order_value,
        COALESCE(SUM(total_commission), 0) as total_shopee_commission,
        COALESCE(SUM(user_commission + referrer_commission), 0) as total_user_payouts
      FROM orders 
      WHERE status IN ('Hoàn thành', 'Đã thanh toán', 'Yêu cầu khấu trừ')
        AND COALESCE(completed_time, order_time) >= ? 
        AND COALESCE(completed_time, order_time) <= ?
    `, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

    const orderKpis = orderKpiRows[0];

    // 2. Lấy KPIs từ thu chi ngoài hệ thống
    const [manualKpiRows] = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) as total_manual_revenue,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_manual_expense
      FROM app_financials
      WHERE transaction_date >= ? AND transaction_date <= ?
    `, [startDate, endDate]);

    const manualKpis = manualKpiRows[0];

    // Tính toán số liệu tổng thể
    const totalShopeeCommission = parseFloat(orderKpis.total_shopee_commission);
    const totalUserPayouts = parseFloat(orderKpis.total_user_payouts);
    const totalManualRevenue = parseFloat(manualKpis.total_manual_revenue);
    const totalManualExpense = parseFloat(manualKpis.total_manual_expense);

    const totalRevenue = totalShopeeCommission + totalManualRevenue;
    const netOrderProfit = totalShopeeCommission - totalUserPayouts;
    const totalActualProfit = netOrderProfit + totalManualRevenue - totalManualExpense;

    const summary = {
      total_orders: parseInt(orderKpis.total_orders) || 0,
      total_order_value: parseFloat(orderKpis.total_order_value) || 0,
      total_shopee_commission: totalShopeeCommission,
      total_user_payouts: totalUserPayouts,
      net_order_profit: netOrderProfit,
      total_manual_revenue: totalManualRevenue,
      total_manual_expense: totalManualExpense,
      total_revenue: totalRevenue,
      total_actual_profit: totalActualProfit
    };

    // 3. Lấy danh sách Top Mua Hàng
    const [topBuyers] = await db.execute(`
      SELECT 
        o.sub_id1 as username, 
        u.email, 
        u.full_name, 
        COUNT(*) as order_count, 
        COALESCE(SUM(o.order_value), 0) as total_order_value, 
        COALESCE(SUM(o.user_commission), 0) as total_user_commission 
      FROM orders o 
      LEFT JOIN users u ON o.sub_id1 = u.username 
      WHERE o.status IN ('Hoàn thành', 'Đã thanh toán', 'Yêu cầu khấu trừ') 
        AND COALESCE(o.completed_time, o.order_time) >= ? 
        AND COALESCE(o.completed_time, o.order_time) <= ? 
        AND o.sub_id1 IS NOT NULL AND o.sub_id1 != '' 
      GROUP BY o.sub_id1, u.email, u.full_name 
      ORDER BY total_order_value DESC 
      LIMIT 10
    `, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

    // 4. Lấy danh sách giao dịch ngoài hệ thống
    const [manualTransactions] = await db.execute(`
      SELECT id, type, amount, category, description, DATE_FORMAT(transaction_date, '%Y-%m-%d') as transaction_date
      FROM app_financials
      WHERE transaction_date >= ? AND transaction_date <= ?
      ORDER BY transaction_date DESC, created_at DESC
    `, [startDate, endDate]);

    // 5. Chuẩn bị dữ liệu biểu đồ
    // Quyết định nhóm theo ngày hay theo tháng dựa trên khoảng thời gian
    const diffTime = Math.abs(new Date(endDate) - new Date(startDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let chartData = [];

    if (diffDays <= 31) {
      // Nhóm theo ngày
      const [orderDaily] = await db.execute(`
        SELECT 
          DATE_FORMAT(COALESCE(completed_time, order_time), '%Y-%m-%d') as date_str,
          SUM(total_commission) as shopee_commission,
          SUM(user_commission + referrer_commission) as user_payouts
        FROM orders
        WHERE status IN ('Hoàn thành', 'Đã thanh toán', 'Yêu cầu khấu trừ')
          AND COALESCE(completed_time, order_time) >= ?
          AND COALESCE(completed_time, order_time) <= ?
        GROUP BY date_str
        ORDER BY date_str ASC
      `, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

      const [manualDaily] = await db.execute(`
        SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m-%d') as date_str,
          SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as manual_revenue,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as manual_expense
        FROM app_financials
        WHERE transaction_date >= ? AND transaction_date <= ?
        GROUP BY date_str
        ORDER BY date_str ASC
      `, [startDate, endDate]);

      // Trộn dữ liệu ngày
      const daysMap = new Map();
      
      // Tạo danh sách đầy đủ tất cả các ngày trong khoảng để biểu đồ không bị khuyết
      let current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        daysMap.set(key, { label: `${dd}/${mm}`, revenue: 0, profit: 0 });
        current.setDate(current.getDate() + 1);
      }

      // Đổ dữ liệu từ đơn hàng
      orderDaily.forEach(row => {
        const key = row.date_str;
        if (daysMap.has(key)) {
          const item = daysMap.get(key);
          const shopeeComm = parseFloat(row.shopee_commission) || 0;
          const userPay = parseFloat(row.user_payouts) || 0;
          item.revenue += shopeeComm;
          item.profit += (shopeeComm - userPay);
        }
      });

      // Đổ dữ liệu từ thu chi ngoài
      manualDaily.forEach(row => {
        const key = row.date_str;
        if (daysMap.has(key)) {
          const item = daysMap.get(key);
          const manualRev = parseFloat(row.manual_revenue) || 0;
          const manualExp = parseFloat(row.manual_expense) || 0;
          item.revenue += manualRev;
          item.profit += (manualRev - manualExp);
        }
      });

      chartData = Array.from(daysMap.entries()).map(([key, value]) => ({
        date: key,
        label: value.label,
        revenue: Math.round(value.revenue),
        profit: Math.round(value.profit)
      }));

    } else {
      // Nhóm theo tháng
      const [orderMonthly] = await db.execute(`
        SELECT 
          DATE_FORMAT(COALESCE(completed_time, order_time), '%Y-%m') as date_str,
          SUM(total_commission) as shopee_commission,
          SUM(user_commission + referrer_commission) as user_payouts
        FROM orders
        WHERE status IN ('Hoàn thành', 'Đã thanh toán', 'Yêu cầu khấu trừ')
          AND COALESCE(completed_time, order_time) >= ?
          AND COALESCE(completed_time, order_time) <= ?
        GROUP BY date_str
        ORDER BY date_str ASC
      `, [startDate + ' 00:00:00', endDate + ' 23:59:59']);

      const [manualMonthly] = await db.execute(`
        SELECT 
          DATE_FORMAT(transaction_date, '%Y-%m') as date_str,
          SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as manual_revenue,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as manual_expense
        FROM app_financials
        WHERE transaction_date >= ? AND transaction_date <= ?
        GROUP BY date_str
        ORDER BY date_str ASC
      `, [startDate, endDate]);

      const monthsMap = new Map();

      // Đổ dữ liệu từ đơn hàng
      orderMonthly.forEach(row => {
        const key = row.date_str;
        const [yyyy, mm] = key.split('-');
        monthsMap.set(key, { 
          label: `Tháng ${mm}/${yyyy}`, 
          revenue: parseFloat(row.shopee_commission) || 0, 
          profit: (parseFloat(row.shopee_commission) || 0) - (parseFloat(row.user_payouts) || 0)
        });
      });

      // Đổ dữ liệu từ thu chi ngoài
      manualMonthly.forEach(row => {
        const key = row.date_str;
        const manualRev = parseFloat(row.manual_revenue) || 0;
        const manualExp = parseFloat(row.manual_expense) || 0;
        if (monthsMap.has(key)) {
          const item = monthsMap.get(key);
          item.revenue += manualRev;
          item.profit += (manualRev - manualExp);
        } else {
          const [yyyy, mm] = key.split('-');
          monthsMap.set(key, {
            label: `Tháng ${mm}/${yyyy}`,
            revenue: manualRev,
            profit: manualRev - manualExp
          });
        }
      });

      chartData = Array.from(monthsMap.entries()).map(([key, value]) => ({
        date: key,
        label: value.label,
        revenue: Math.round(value.revenue),
        profit: Math.round(value.profit)
      })).sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({
      summary,
      topBuyers,
      manualTransactions,
      chartData
    });

  } catch (error) {
    console.error('Lỗi khi lấy báo cáo tài chính:', error);
    return NextResponse.json({ error: 'Lỗi cơ sở dữ liệu: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { type, amount, category, description, transaction_date } = await request.json();

    if (!type || !amount || !category || !transaction_date) {
      return NextResponse.json({ error: 'Các trường type, amount, category, transaction_date là bắt buộc' }, { status: 400 });
    }

    const db = await getConnection();
    await db.execute(`
      INSERT INTO app_financials (type, amount, category, description, transaction_date)
      VALUES (?, ?, ?, ?, ?)
    `, [type, amount, category, description || '', transaction_date]);

    return NextResponse.json({ message: 'Giao dịch đã được ghi nhận thành công' });
  } catch (error) {
    console.error('Lỗi khi thêm giao dịch:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id, type, amount, category, description, transaction_date } = await request.json();

    if (!id || !type || !amount || !category || !transaction_date) {
      return NextResponse.json({ error: 'Thiếu thông tin cập nhật' }, { status: 400 });
    }

    const db = await getConnection();
    await db.execute(`
      UPDATE app_financials 
      SET type = ?, amount = ?, category = ?, description = ?, transaction_date = ?
      WHERE id = ?
    `, [type, amount, category, description || '', transaction_date, id]);

    return NextResponse.json({ message: 'Giao dịch cập nhật thành công' });
  } catch (error) {
    console.error('Lỗi khi sửa giao dịch:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id giao dịch để xóa' }, { status: 400 });
    }

    const db = await getConnection();
    await db.execute('DELETE FROM app_financials WHERE id = ?', [id]);

    return NextResponse.json({ message: 'Giao dịch đã được xóa thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa giao dịch:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
