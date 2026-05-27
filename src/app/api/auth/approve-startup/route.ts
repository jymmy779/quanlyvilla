import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    // Check profile
    const profile = await db('profiles').where({ id: payload.userId }).first();
    if (!profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 404 });
    }

    if (profile.role !== 'pending_owner') {
      return NextResponse.json({ success: true, message: 'Tài khoản đã ở trạng thái hợp lệ.' });
    }

    const tenantId = profile.tenant_id || payload.userId;

    await db.transaction(async (trx) => {
      await trx('tenants').where({ id: tenantId }).update({ status: 'active' });
      await trx('profiles').where({ id: payload.userId }).update({
        role: 'owner',
        tenant_id: tenantId,
      });

      // Seed default settings if not exist — check first for cross-dialect compat
      const existingSettings = await trx('settings').where({ tenant_id: tenantId });
      if (existingSettings.length === 0) {
        const defaults = [
          { key: 'site_name', value: 'Rentify', tenant_id: tenantId },
          { key: 'currency', value: 'VND', tenant_id: tenantId },
          { key: 'timezone', value: 'Asia/Ho_Chi_Minh', tenant_id: tenantId },
          { key: 'booking_prefix', value: 'BK-', tenant_id: tenantId },
        ];
        await trx('settings').insert(defaults);
      }
    });

    return NextResponse.json({ success: true, message: 'Đã phê duyệt tài khoản startup.' });
  } catch (err: any) {
    console.error('[API Approve Startup] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}