import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await db('users').where({ id: payload.userId }).update({ password_hash: passwordHash });

    return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu thành công!' });
  } catch (err: any) {
    console.error('[API Change Password] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}