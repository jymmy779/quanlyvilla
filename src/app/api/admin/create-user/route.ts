import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const { email, password, fullName, phone, role } = await req.json();

    if (!email || !password || !fullName || !phone || !role) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các trường thông tin.' }, { status: 400 });
    }

    // Get full actor profile
    const actorProfile = await db('profiles').where({ id: payload.userId }).first();
    if (!actorProfile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 404 });
    }

    // Check role hierarchy: only owner/admin can create users, and cannot create higher roles
    if (actorProfile.role === 'pending' || actorProfile.role === 'pending_owner') {
      return NextResponse.json({ error: 'Từ chối truy cập! Chỉ Chủ sở hữu (Owner) hoặc Quản trị viên (Admin) mới được thực hiện thao tác này.' }, { status: 403 });
    }
    if (role === 'owner' && actorProfile.role !== 'owner') {
      return NextResponse.json({ error: 'Không thể tạo tài khoản owner với quyền hiện tại.' }, { status: 403 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // Check existing email
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return NextResponse.json({ error: 'Email này đã được đăng ký trong hệ thống.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await db.transaction(async (trx) => {
      const [newUser] = await trx('users').insert({ email, password_hash: passwordHash }).returning('id');
      const newUserId = newUser.id ?? newUser;

      await trx('profiles').insert({
        id: newUserId,
        email,
        full_name: fullName,
        phone,
        role,
        tenant_id: actorProfile.tenant_id || payload.userId,
      });
    });

    return NextResponse.json({ success: true, message: 'Đã tạo tài khoản nhân viên thành công!' });
  } catch (err: any) {
    console.error('[API Create User] 💥', err);
    if (err?.code === 'ER_DUP_ENTRY' || err?.number === 2627 || err?.code === '23505') {
      return NextResponse.json({ error: 'Email này đã được đăng ký trong hệ thống.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}