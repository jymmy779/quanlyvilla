import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      password,
      fullName,
      phone,
      startupName,
      businessType,
      activationCode,
    } = await req.json();

    if (!email || !password || !fullName || !phone || !startupName || !businessType) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // Check for existing email
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return NextResponse.json({ error: 'Email này đã được đăng ký trong hệ thống.' }, { status: 409 });
    }

    const isBypass = activationCode?.trim().toUpperCase() === 'RENTIFY_PREMIUM_2026';
    const tenantStatus = isBypass ? 'active' : 'pending';
    const userRole = isBypass ? 'owner' : 'pending_owner';

    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();

    await db.transaction(async (trx) => {
      // Create user
      await trx('users').insert({ id: userId, email, password_hash: passwordHash });

      // Create tenant
      await trx('tenants').insert({
        id: tenantId,
        name: startupName,
        phone,
        business_type: businessType,
        status: tenantStatus,
      });

      // Create profile
      await trx('profiles').insert({
        id: userId,
        email,
        full_name: fullName,
        phone,
        role: userRole,
        tenant_id: tenantId,
      });

      // Seed default settings - use INSERT IGNORE equivalent
      const settingsRows = [
        { key: 'site_name', value: 'Rentify', tenant_id: tenantId },
        { key: 'currency', value: 'VND', tenant_id: tenantId },
        { key: 'timezone', value: 'Asia/Ho_Chi_Minh', tenant_id: tenantId },
        { key: 'booking_prefix', value: 'BK-', tenant_id: tenantId },
      ];
      await trx('settings').insert(settingsRows);
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Register Startup] 💥 Lỗi hệ thống:', err);
    // Check for duplicate key violation
    if (err?.code === 'ER_DUP_ENTRY' || err?.number === 2627 || err?.code === '23505') {
      return NextResponse.json({ error: 'Email này đã được đăng ký trong hệ thống.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}