import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

const ACTIVE_ROLES = ['owner', 'admin'];

function canEditUserProfile(actorRole: string, targetRole: string, isSelf: boolean): boolean {
  if (isSelf) return true;
  if (!ACTIVE_ROLES.includes(actorRole)) return false;
  if (actorRole === 'owner') return true;
  // admin can only edit staff/pending
  if (actorRole === 'admin' && !['owner', 'admin'].includes(targetRole)) return true;
  return false;
}

function canSetUserRole(actorRole: string, currentRole: string, newRole: string, isSelf: boolean): boolean {
  if (isSelf) return false; // can't change your own role
  if (!ACTIVE_ROLES.includes(actorRole)) return false;
  if (actorRole === 'owner') return true;
  // admin can only change roles to/from non-owner non-admin
  if (actorRole === 'admin' && !['owner', 'admin'].includes(currentRole) && !['owner', 'admin'].includes(newRole)) return true;
  return false;
}

function canDeleteUser(actorRole: string, targetRole: string, isSelf: boolean): boolean {
  if (isSelf) return false; // can't delete yourself
  if (!ACTIVE_ROLES.includes(actorRole)) return false;
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin' && !['owner', 'admin'].includes(targetRole)) return true;
  return false;
}

export async function PATCH(req: NextRequest) {
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
      return NextResponse.json({ error: 'Từ chối truy cập.' }, { status: 403 });
    }

    const { userId, fullName, phone, role } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu User ID.' }, { status: 400 });
    }

    const targetProfile = await db('profiles').where({ id: userId }).first();
    if (!targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần cập nhật.' }, { status: 404 });
    }

    // Tenant isolation check
    if (actorProfile.tenant_id && targetProfile.tenant_id && actorProfile.tenant_id !== targetProfile.tenant_id) {
      return NextResponse.json({ error: 'Tài khoản không thuộc cùng hệ thống.' }, { status: 403 });
    }

    const isSelf = payload.userId === userId;
    const hasProfileUpdate = typeof fullName === 'string' || typeof phone === 'string';
    const hasRoleUpdate = typeof role === 'string' && role !== targetProfile.role;

    if (!hasProfileUpdate && !hasRoleUpdate) {
      return NextResponse.json({ error: 'Không có dữ liệu để cập nhật.' }, { status: 400 });
    }

    if (hasProfileUpdate && !canEditUserProfile(actorProfile.role, targetProfile.role, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền sửa thông tin tài khoản này.' }, { status: 403 });
    }

    if (hasRoleUpdate && !canSetUserRole(actorProfile.role, targetProfile.role, role, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền thay đổi vai trò này.' }, { status: 403 });
    }

    const updateData: Record<string, any> = {};
    if (typeof fullName === 'string') updateData.full_name = fullName.trim();
    if (typeof phone === 'string') updateData.phone = phone.trim();
    if (typeof role === 'string') updateData.role = role;

    await db('profiles').where({ id: userId }).update(updateData);

    return NextResponse.json({ success: true, message: 'Đã cập nhật tài khoản thành công.' });
  } catch (err: any) {
    console.error('[API Manage User] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
      return NextResponse.json({ error: 'Từ chối truy cập.' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Thiếu User ID.' }, { status: 400 });
    }

    const targetProfile = await db('profiles').where({ id: userId }).first();
    if (!targetProfile) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản cần xóa.' }, { status: 404 });
    }

    // Tenant isolation check
    if (actorProfile.tenant_id && targetProfile.tenant_id && actorProfile.tenant_id !== targetProfile.tenant_id) {
      return NextResponse.json({ error: 'Tài khoản không thuộc cùng hệ thống.' }, { status: 403 });
    }

    const isSelf = payload.userId === userId;
    if (!canDeleteUser(actorProfile.role, targetProfile.role, isSelf)) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa tài khoản này.' }, { status: 403 });
    }

    // Delete user (CASCADE will remove profile)
    await db('users').where({ id: userId }).del();

    return NextResponse.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (err: any) {
    console.error('[API Manage User] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}