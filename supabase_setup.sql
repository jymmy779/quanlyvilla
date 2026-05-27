-- ==========================================================
-- SUPABASE SETUP: BẢNG PROFILES & PHÂN QUYỀN NỘI BỘ (RBAC)
-- Hướng dẫn: Copy toàn bộ nội dung file này và dán vào
-- Supabase Dashboard -> SQL Editor -> Run
-- ==========================================================

-- 1. Tạo bảng profiles lưu thông tin quyền hạn và thông tin nhân viên
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'pending' check (role in ('admin', 'staff', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bật Row Level Security (RLS) để bảo mật
alter table public.profiles enable row level security;

-- Xóa các policies cũ nếu tồn tại để tránh xung đột
drop policy if exists "Cho phép người dùng xem profile cá nhân hoặc admin xem hết" on public.profiles;
drop policy if exists "Cho phép người dùng tự sửa profile cá nhân" on public.profiles;
drop policy if exists "Admin có toàn quyền trên profiles" on public.profiles;

-- 2. Tạo hàm Helper kiểm tra quyền Admin (security definer để bỏ qua RLS khi truy vấn chính bảng profiles)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Tạo policy SELECT: Cho phép người dùng xem profile cá nhân hoặc Admin xem hết
create policy "Cho phép người dùng xem profile cá nhân hoặc admin xem hết"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id or public.is_admin()
  );

-- 4. Tạo policy UPDATE: Cho phép người dùng tự sửa profile cá nhân
create policy "Cho phép người dùng tự sửa profile cá nhân"
  on public.profiles for update
  to authenticated
  using (
    auth.uid() = id
  );

-- 5. Tạo policy ALL (Xóa, Thêm, Sửa): Chỉ Admin mới được thực hiện các quyền này trên profile người khác
create policy "Admin có toàn quyền trên profiles"
  on public.profiles for all
  to authenticated
  using (
    public.is_admin()
  );

-- 6. Trigger tự động tạo profile khi có tài khoản mới đăng ký qua Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    -- Tài khoản đầu tiên đăng ký hệ thống sẽ tự động là 'admin' để quản trị,
    -- các tài khoản đăng ký sau mặc định là 'pending' (Chờ duyệt)
    case 
      when not exists (select 1 from public.profiles) then 'admin'
      else 'pending'
    end
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Liên kết trigger với auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
