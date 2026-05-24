import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getConnection } from '@/lib/db';
import { sendEmail } from '@/lib/email';

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateUsername(username) {
  const re = /^[a-z0-9]+$/;
  return re.test(username);
}

export async function POST(request) {
  try {
    let { username, email, password, referralCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Định dạng email không hợp lệ' }, { status: 400 });
    }

    const db = await getConnection();

    if (username) {
      username = username.toLowerCase();
      if (!validateUsername(username)) {
        return NextResponse.json({ error: 'Tên đăng nhập chỉ được chứa chữ cái và số, không có ký tự đặc biệt' }, { status: 400 });
      }
    } else {
      // Sinh username ngẫu nhiên 6 ký tự và đảm bảo không bị trùng lặp
      const generateRandomUsername = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      let uniqueUsername = false;
      let attempts = 0;
      while (!uniqueUsername && attempts < 10) {
        username = generateRandomUsername();
        const [existing] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length === 0) {
          uniqueUsername = true;
        }
        attempts++;
      }
    }

    // Check if referralCode exists if provided
    let referrerId = null;
    if (referralCode && referralCode.trim() !== '') {
      const cleanRefCode = referralCode.trim().toLowerCase();
      // Không cho phép tự giới thiệu chính mình
      if (cleanRefCode === username) {
        return NextResponse.json({ error: 'Bạn không thể nhập mã giới thiệu của chính mình' }, { status: 400 });
      }
      const [referrerRows] = await db.execute('SELECT id FROM users WHERE username = ?', [cleanRefCode]);
      if (referrerRows.length === 0) {
        return NextResponse.json({ error: 'Mã giới thiệu (tên đăng nhập) không tồn tại trên hệ thống' }, { status: 400 });
      }
      referrerId = referrerRows[0].id;
    }

    // Check if email exists
    const [emailRows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (emailRows.length > 0) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    // Check if username exists
    const [userRows] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userRows.length > 0) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Sinh mã OTP 6 chữ số và thời gian hết hạn (10 phút sau)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);
    
    const pad = (n) => String(n).padStart(2, '0');
    const mysqlExpiry = `${expiryDate.getFullYear()}-${pad(expiryDate.getMonth() + 1)}-${pad(expiryDate.getDate())} ${pad(expiryDate.getHours())}:${pad(expiryDate.getMinutes())}:${pad(expiryDate.getSeconds())}`;

    // Insert user - set commission_rate là 0.50, is_verified là 0 (chưa kích hoạt)
    const [insertResult] = await db.execute(
      'INSERT INTO users (username, email, password_hash, commission_rate, is_verified, verification_token, verification_token_expiry) VALUES (?, ?, ?, 0.50, 0, ?, ?)', 
      [username, email, passwordHash, otp, mysqlExpiry]
    );
    const newUserId = insertResult.insertId;

    // Nếu có người giới thiệu hợp lệ, tạo mối liên kết referrals
    if (referrerId && newUserId) {
      await db.execute('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)', [referrerId, newUserId]);
      console.log(`✔ Đã tạo mối liên kết giới thiệu: User ID ${newUserId} được giới thiệu bởi User ID ${referrerId}`);
    }

    // Gửi email mã OTP (SMTP ưu tiên, Resend dự phòng)
    await sendEmail({
      from: 'Shopee Affiliate <noreply@pishare.site>',
      to: email,
      subject: 'Mã xác thực OTP kích hoạt tài khoản - Shopee Affiliate',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a73e8; margin-top: 0;">Chào mừng bạn đến với PiShare.site!</h2>
            </div>
            <p>Xin chào <strong>${username}</strong>,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản trên hệ thống rút gọn và hoàn tiền Shopee Affiliate của chúng tôi.</p>
            <p>Để hoàn tất việc kích hoạt tài khoản, vui lòng sử dụng mã xác thực OTP dưới đây. Mã này có hiệu lực trong vòng <strong>10 phút</strong>:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #1a73e8; letter-spacing: 6px; background-color: #f1f3f4; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="text-align: center; color: #666; font-size: 13px;">Mã OTP có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo mật tài khoản.</p>
            <br/>
            <p>Nếu bạn không thực hiện đăng ký tài khoản này, xin vui lòng bỏ qua email này.</p>
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">Hệ thống PiShare.site - Hỗ trợ: anhtudh95@gmail.com - Zalo: 0397872462</p>
          </div>
        `
    });

    return NextResponse.json({ 
      message: 'Đăng ký thành công. Vui lòng kiểm tra email của bạn để lấy mã OTP xác thực.', 
      username,
      email,
      requiresVerification: true
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      error: `Lỗi đăng ký (500): ${error.message || error.code || 'Lỗi không xác định'}`,
      details: error.stack 
    }, { status: 500 });
  }
}
