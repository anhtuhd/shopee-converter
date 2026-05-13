import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const db = await getConnection();
    const [rows] = await db.execute('SELECT id, username, email, full_name, phone, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit.toString(), offset.toString()]);
    const [countRows] = await db.execute('SELECT COUNT(*) as total FROM users');
    
    return NextResponse.json({
      users: rows,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { username, email, password, full_name, phone, role } = await request.json();
    const password_hash = await bcrypt.hash(password || '123456', 10);
    const db = await getConnection();
    await db.execute(
      'INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password_hash, full_name || '', phone || '', role || 'user']
    );
    return NextResponse.json({ message: 'User created' });
  } catch (error) {
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { id, username, email, full_name, phone, role, password } = await request.json();
    const db = await getConnection();
    
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE users SET username=?, email=?, full_name=?, phone=?, role=?, password_hash=? WHERE id=?',
        [username, email, full_name || '', phone || '', role, password_hash, id]
      );
    } else {
      await db.execute(
        'UPDATE users SET username=?, email=?, full_name=?, phone=?, role=? WHERE id=?',
        [username, email, full_name || '', phone || '', role, id]
      );
    }
    return NextResponse.json({ message: 'User updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!await checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = await getConnection();
    await db.execute('DELETE FROM users WHERE id=?', [id]);
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting user' }, { status: 500 });
  }
}
