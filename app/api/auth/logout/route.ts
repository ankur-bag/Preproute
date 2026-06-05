// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbDeleteSession } from '@/lib/dbController';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.userId) {
        await dbDeleteSession(payload.userId);
      }
    }

    const response = NextResponse.json({ success: true });
    
    // Clear cookie by setting it to expire immediately
    response.cookies.set('token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Logout route error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
