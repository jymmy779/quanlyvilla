import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const profile = await db('profiles')
      .select('id', 'email', 'full_name', 'phone', 'role', 'tenant_id', 'created_at')
      .where({ id: payload.userId })
      .first();

    if (!profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error('[API Profile GET] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const { fullName, phone } = await req.json();
    if (!fullName && !phone) {
      return NextResponse.json({ error: 'Vui lòng cung cấp thông tin cần cập nhật.' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (typeof fullName === 'string') updateData.full_name = fullName.trim();
    if (typeof phone === 'string') updateData.phone = phone.trim();

    await db('profiles').where({ id: payload.userId }).update(updateData);

    return NextResponse.json({ success: true, message: 'Đã cập nhật hồ sơ thành công!' });
  } catch (err: any) {
    console.error('[API Profile PATCH] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}