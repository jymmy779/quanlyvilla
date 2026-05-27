import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thiếu Tenant ID.' }, { status: 400 });
    }

    const tenant = await db('tenants')
      .select('id', 'name', 'phone', 'business_type', 'status', 'created_at')
      .where({ id })
      .first();

    if (!tenant) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin doanh nghiệp.' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (err: any) {
    console.error('[API Tenant GET] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}