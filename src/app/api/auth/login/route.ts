import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập email và mật khẩu.' }, { status: 400 });
    }

    // Find user by email
    const user = await db('users').where({ email }).first();

    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    // Verify password
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    // Get profile to include role + tenant_id in JWT
    const profile = await db('profiles').where({ id: user.id }).first();

    // Sign JWT
    const token = signToken({
      userId: user.id,
      role: profile?.role || 'pending',
      tenantId: profile?.tenant_id || undefined,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role || 'pending',
        tenantId: profile?.tenant_id || null,
      },
    });
  } catch (err: any) {
    console.error('[API Login] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}