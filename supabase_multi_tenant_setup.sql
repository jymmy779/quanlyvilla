-- ==========================================================
-- SUPABASE MIGRATION: NÂNG CẤP SAAS MULTI-TENANT BẢO MẬT & ĐỘC LẬP (OWNER FLOW)
-- Hướng dẫn: Copy toàn bộ nội dung file này và dán vào
-- Supabase Dashboard -> SQL Editor -> Run
-- ==========================================================

-- 1. Tạo bảng tenants lưu trữ thông tin chuỗi/Startup của từng khách hàng đăng ký
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  business_type text, -- Loại hình: Homestay, Villa, Apartment, Room...
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật Row Level Security (RLS) cho bảng tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tạo các policy RLS cho bảng tenants
DROP POLICY IF EXISTS "Cho phép người dùng xem thông tin tenant của mình" ON public.tenants;
CREATE POLICY "Cho phép người dùng xem thông tin tenant của mình"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Chủ sở hữu được cập nhật thông tin tenant của mình" ON public.tenants;
CREATE POLICY "Chủ sở hữu được cập nhật thông tin tenant của mình"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );

-- 2. Bổ sung cột tenant_id vào các bảng hiện có để phân hoạch dữ liệu
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.villas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Nâng cấp ràng buộc vai trò (role) trong profiles để hỗ trợ 'owner' và 'pending_owner'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('owner', 'admin', 'staff', 'pending', 'pending_owner'));

-- 3. Cập nhật dữ liệu cũ: Mặc định tất cả dữ liệu hiện tại thuộc về Admin đầu tiên trong hệ thống dưới tư cách là Owner
DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  -- Lấy ID của Admin đầu tiên được tạo ra trong hệ thống
  SELECT id INTO first_admin_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    -- Tạo 1 record Tenant mặc định cho Startup hiện tại của anh
    INSERT INTO public.tenants (id, name, status)
    VALUES (first_admin_id, 'Startup Gốc', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- Tất cả tài khoản hiện có trong hệ thống (cả admin khác và staff) đều quy tụ về chung 1 Startup của Admin đầu tiên
    UPDATE public.profiles SET tenant_id = COALESCE(tenant_id, first_admin_id);
    
    -- Nâng cấp Admin đầu tiên làm Owner tối cao của Startup này
    UPDATE public.profiles SET role = 'owner' WHERE id = first_admin_id;

    -- Toàn bộ căn, lịch đặt, cài đặt cũ sẽ được gán cho Admin đầu tiên này
    UPDATE public.villas SET tenant_id = COALESCE(tenant_id, first_admin_id);
    UPDATE public.bookings SET tenant_id = COALESCE(tenant_id, first_admin_id);
    UPDATE public.settings SET tenant_id = COALESCE(tenant_id, first_admin_id);
  END IF;
END $$;

-- 4. Cấu trúc lại khóa chính bảng settings thành composite key (key, tenant_id)
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey CASCADE;
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key CASCADE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'settings_key_tenant_id_pkey'
  ) THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_key_tenant_id_pkey PRIMARY KEY (key, tenant_id);
  END IF;
END $$;

-- Bật Row Level Security (RLS) bảo mật tuyệt đối cho bảng settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Xóa các policy settings cũ nếu tồn tại
DROP POLICY IF EXISTS "Cho phép người dùng xem cấu hình cùng tenant" ON public.settings;
DROP POLICY IF EXISTS "Chủ sở hữu và Admin được sửa cấu hình cùng tenant" ON public.settings;

-- Tạo policy xem cấu hình: Người dùng chỉ được xem cấu hình của cùng tenant_id với họ
CREATE POLICY "Cho phép người dùng xem cấu hình cùng tenant"
  ON public.settings FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Tạo policy ghi cấu hình: Chỉ Owner/Admin mới được sửa cấu hình của tenant mình
CREATE POLICY "Chủ sở hữu và Admin được sửa cấu hình cùng tenant"
  ON public.settings FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()) AND
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('owner', 'admin')
  );

-- 5. Kích hoạt RLS bảo mật cho bảng villas & bookings & profiles
ALTER TABLE public.villas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Xóa các policy profiles cũ nếu tồn tại
DROP POLICY IF EXISTS "Cho phép người dùng xem profile cá nhân hoặc admin xem hết" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép người dùng tự sửa profile cá nhân" ON public.profiles;
DROP POLICY IF EXISTS "Admin có toàn quyền trên profiles" ON public.profiles;
DROP POLICY IF EXISTS "Cho phép xem profile cùng Startup" ON public.profiles;
DROP POLICY IF EXISTS "Owner và Admin được quản lý nhân sự cùng Startup" ON public.profiles;

-- Tạo policy xem profile: Thành viên chỉ được xem thông tin nhân sự cùng Startup của mình
CREATE POLICY "Cho phép xem profile cùng Startup"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Tạo policy ghi profiles: Chỉ Owner/Admin mới được thay đổi quyền hạn nhân viên trong Startup mình
CREATE POLICY "Owner và Admin được quản lý nhân sự cùng Startup"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    (
      tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  );

-- Xóa các policy villas cũ nếu tồn tại
DROP POLICY IF EXISTS "Cho phép người dùng xem villas cùng tenant" ON public.villas;
DROP POLICY IF EXISTS "Cho phép Admin quản lý villas cùng tenant" ON public.villas;
DROP POLICY IF EXISTS "Cho phép Owner và Admin quản lý villas cùng tenant" ON public.villas;

-- Tạo policy xem villas: Chỉ xem căn thuộc tenant mình
CREATE POLICY "Cho phép người dùng xem villas cùng tenant"
  ON public.villas FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Tạo policy ghi villas: Chỉ Owner/Admin mới được thêm/sửa/xóa căn thuộc tenant mình
CREATE POLICY "Cho phép Owner và Admin quản lý villas cùng tenant"
  ON public.villas FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()) AND
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('owner', 'admin')
  );

-- Xóa các policy bookings cũ nếu tồn tại
DROP POLICY IF EXISTS "Cho phép người dùng xem bookings cùng tenant" ON public.bookings;
DROP POLICY IF EXISTS "Cho phép người dùng quản lý bookings cùng tenant" ON public.bookings;

-- Tạo policy xem bookings: Xem đơn thuộc tenant mình
CREATE POLICY "Cho phép người dùng xem bookings cùng tenant"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Tạo policy ghi bookings: Cả Owner, Staff & Admin cùng tenant đều được thêm/sửa đơn đặt
CREATE POLICY "Cho phép người dùng quản lý bookings cùng tenant"
  ON public.bookings FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 6. Cập nhật hàm trigger tạo user handle_new_user() để hỗ trợ tách luồng đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  first_user boolean;
BEGIN
  -- Kiểm tra xem hệ thống đã có tài khoản nào chưa
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
  
  -- Nếu là người đăng ký đầu tiên -> Tự động kích hoạt thành Owner của Startup Gốc
  IF first_user THEN
    INSERT INTO public.tenants (id, name, status)
    VALUES (new.id, 'Startup Gốc', 'active')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id)
    VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      'owner',
      new.id
    );
  ELSE
    -- Đăng ký thông thường qua nút Đăng ký mặc định là 'pending' và CHƯA có tenant_id
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id)
    VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      'pending',
      NULL
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer SET search_path = public;

-- Khôi phục lại trigger liên kết
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
