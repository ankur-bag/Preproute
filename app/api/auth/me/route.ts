// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbGetSession } from '@/lib/dbController';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      const response = NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
      response.cookies.delete('token');
      return response;
    }

    // Verify session still exists in DB/memory cache
    const session = await dbGetSession(payload.userId);
    if (!session) {
      const response = NextResponse.json(
        { success: false, message: 'Session expired' },
        { status: 401 }
      );
      response.cookies.delete('token');
      return response;
    }

    return NextResponse.json({
      success: true,
      user: payload.user,
    });
  } catch (err: any) {
    console.error('Auth me route error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
