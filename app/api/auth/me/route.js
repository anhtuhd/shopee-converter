import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_shopee_converter_123';

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    return NextResponse.json({ 
      authenticated: true, 
      username: decoded.username,
      role: decoded.role
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
