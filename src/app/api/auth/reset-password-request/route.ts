import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Vui lòng nhập email.' }, { status: 400 });
    }

    // Check if email exists (without revealing existence for security)
    const existingUser = await db('users').where({ email }).first();

    if (!existingUser) {
      // Don't reveal that the email doesn't exist
      return NextResponse.json({
        success: true,
        message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      });
    }

    // TODO: In production, send email with reset link
    console.log(`[Reset Password] User ${existingUser.id} requested password reset for ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
    });
  } catch (err: any) {
    console.error('[API Reset Password Request] 💥', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}