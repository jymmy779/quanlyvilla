import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone } = await req.json();

    if (!email || !password || !fullName || !phone) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // Check existing
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return NextResponse.json({ error: 'Email này đã được đăng ký.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    let userId: string;

    // Use transaction
    const result = await db.transaction(async (trx) => {
      // Create user
      const [user] = await trx('users').insert({ email, password_hash: passwordHash }).returning('id');
      userId = user.id ?? user;

      // Create profile manually (no trigger needed for cross-dialect compat)
      await trx('profiles').insert({
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: 'pending',
      });

      // Create default tenant
      const [tenant] = await trx('tenants').insert({
        name: `${email.split('@')[0]}'s Business`,
        status: 'active',
      }).returning('id');
      const tenantId = tenant.id ?? tenant;

      // Assign user to tenant
      await trx('profiles').where({ id: userId }).update({ tenant_id: tenantId });

      return { userId, tenantId };
    });

    // Sign JWT
    const token = signToken({
      userId: result.userId,
      role: 'pending',
      tenantId: result.tenantId,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: result.userId,
        email,
        role: 'pending',
        tenantId: result.tenantId,
      },
    });
  } catch (err: any) {
    console.error('[API Register] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}