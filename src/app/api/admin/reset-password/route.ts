import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // 1. Lấy token xác thực từ Header của Admin gửi lên
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Chưa xác thực quyền truy cập.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Khởi tạo client thông thường để verify token của người gọi API
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' }, { status: 401 });
    }

    // 2. Kiểm tra xem người gọi API này có đúng là Admin trong bảng profiles không
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Từ chối truy cập! Chỉ Admin mới được thực hiện thao tác này.' }, { status: 403 });
    }

    // 3. Đọc dữ liệu gửi lên
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin User ID hoặc Mật khẩu mới.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // 4. Kiểm tra biến môi trường Service Role Key trên máy chủ
    if (!serviceRoleKey) {
      return NextResponse.json({
        error: 'Chưa cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY trên server. Vui lòng thêm biến này vào file .env.local để kích hoạt tính năng reset mật khẩu trực tiếp.'
      }, { status: 501 });
    }

    // 5. Khởi tạo Admin Client của Supabase để có quyền cập nhật tài khoản khác
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (resetError) {
      return NextResponse.json({ error: resetError.message || 'Lỗi khi reset mật khẩu.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Đã đặt lại mật khẩu nhân viên thành công!' });

  } catch (err: any) {
    console.error('Lỗi API Reset Password:', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
