import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest, hashPassword } from '@/lib/auth';

const ACTIVE_ROLES = ['owner', 'admin'];

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const actorProfile = await db('profiles').where({ id: payload.userId }).first();
    if (!actorProfile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 404 });
    }
    if (!ACTIVE_ROLES.includes(actorProfile.role)) {
      return NextResponse.json({ error: 'Từ chối truy cập! Chỉ Chủ sở hữu hoặc Quản trị viên mới được thực hiện thao tác này.' }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin User ID hoặc Mật khẩu mới.' }, { status: 400 });
    }

    const targetProfile = await db('profiles').where({ id: userId }).first();
    if (!targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin tài khoản cần đặt lại mật khẩu.' }, { status: 404 });
    }

    // Permission check
    const isSelf = payload.userId === userId;
    if (isSelf) {
      return NextResponse.json({ error: 'Không thể tự đặt lại mật khẩu của chính mình ở đây.' }, { status: 403 });
    }
    if (actorProfile.role === 'admin' && ['owner', 'admin'].includes(targetProfile.role)) {
      return NextResponse.json({ error: 'Bạn không có quyền đặt lại mật khẩu cho tài khoản này.' }, { status: 403 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await db('users').where({ id: userId }).update({ password_hash: passwordHash });

    return NextResponse.json({ success: true, message: 'Đã đặt lại mật khẩu nhân viên thành công!' });
  } catch (err: any) {
    console.error('[API Reset Password] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}