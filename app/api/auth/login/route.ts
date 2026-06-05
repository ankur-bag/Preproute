// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbSaveSession } from '@/lib/dbController';
import { signToken } from '@/lib/jwt';
import externalApi from '@/lib/externalApi';

export async function POST(req: NextRequest) {
  try {
    const { userId, password } = await req.json();

    let externalToken = '';
    let user: any = null;
    let isMock = false;

    try {
      const { data } = await externalApi.post('/auth/login', { userId, password });
      if (data && data.success) {
        externalToken = data.data.token;
        user = data.data.user;
      } else {
        throw new Error(data?.message || 'External auth login failed');
      }
    } catch (err: any) {
      console.warn('External API login failed. Falling back to local credential check. Error:', err.message);
      
      // Fallback: check credentials locally (e.g. vedant-admin / vedant123 as defined in PRD)
      if (userId === 'vedant-admin' && password === 'vedant123') {
        isMock = true;
        externalToken = 'mock-external-token-vedant-123';
        user = {
          id: 'vedant-admin',
          name: 'Vedant Admin',
          role: 'Admin',
        };
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid credentials' },
          { status: 401 }
        );
      }
    }

    // Save session cache in DB or memory
    await dbSaveSession(userId, externalToken, user);

    // Issue our JWT (no external token inside payload)
    const ourToken = signToken({ userId, user });

    // Build the response
    const response = NextResponse.json({ success: true, user, isMock });
    
    // Set httpOnly cookie
    response.cookies.set('token', ourToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
