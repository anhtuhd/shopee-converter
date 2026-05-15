import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET(request) {
  // Verify Cron Secret if provided in environment (recommended for security on Vercel)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getConnection();
    
    // Perform a simple query to keep the connection alive/active
    const [rows] = await db.execute('SELECT 1 as heartbeat');
    
    console.log('Aiven Heartbeat successful:', rows);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Heartbeat sent successfully',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Aiven Heartbeat failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Heartbeat failed',
      details: error.message 
    }, { status: 500 });
  }
}
