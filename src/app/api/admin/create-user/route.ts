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
    const { email, password, fullName, phone, role } = await req.json();
    console.log('[API Create User] 🚀 Nhận yêu cầu tạo tài khoản mới:', { email, fullName, phone, role });

    if (!email || !password || !fullName || !phone || !role) {
      console.warn('[API Create User] ⚠️ Thiếu thông tin đầu vào');
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các trường thông tin.' }, { status: 400 });
    }

    if (password.length < 6) {
      console.warn('[API Create User] ⚠️ Mật khẩu quá ngắn');
      return NextResponse.json({ error: 'Mật khẩu phải từ 6 ký tự trở lên.' }, { status: 400 });
    }

    // 4. Kiểm tra biến môi trường Service Role Key trên máy chủ
    if (!serviceRoleKey) {
      console.error('[API Create User] ❌ Thiếu biến SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({
        error: 'Chưa cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY trên server. Vui lòng thêm biến này vào file .env.local để Admin có thể thêm nhân viên trực tiếp.'
      }, { status: 501 });
    }

    // 5. Khởi tạo Admin Client của Supabase
    console.log('[API Create User] ⚙️ Đang khởi tạo Supabase Admin Client...');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[API Create User] 🔑 Đang gọi auth.admin.createUser...');
    const { data: createdUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Kích hoạt tài khoản luôn, không cần gửi mail xác nhận
      user_metadata: {
        full_name: fullName,
        phone: phone
      }
    });

    if (createUserError || !createdUserData.user) {
      console.error('[API Create User] ❌ Lỗi từ auth.admin.createUser:', createUserError);
      return NextResponse.json({ error: createUserError?.message || 'Lỗi khi tạo tài khoản.' }, { status: 500 });
    }

    console.log('[API Create User] ✅ Tạo tài khoản thành công trong auth.users! ID:', createdUserData.user.id);

    // 6. Cập nhật ngay lập tức quyền hạn (role) trong bảng profiles
    console.log('[API Create User] 📝 Đang cập nhật vai trò (role) trong bảng profiles...');
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', createdUserData.user.id);

    if (updateProfileError) {
      console.error('[API Create User] ⚠️ Lỗi cập nhật profiles:', updateProfileError);
    } else {
      console.log('[API Create User] 🎉 Cập nhật profiles thành công!');
    }

    return NextResponse.json({ success: true, message: 'Đã tạo tài khoản nhân viên thành công!' });

  } catch (err: any) {
    console.error('[API Create User] 💥 Lỗi bắt ngoại lệ hệ thống:', err);
    return NextResponse.json({ error: err.message || 'Đã xảy ra lỗi hệ thống.' }, { status: 500 });
  }
}
