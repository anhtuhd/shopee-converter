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
      'SELECT id, username, email, full_name, phone, bank_qr, role, commission_rate, created_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE sub_id1 = ? ORDER BY order_time DESC',
      [users[0].username]
    );

    return NextResponse.json({ user: users[0], orders }, { status: 200 });
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
