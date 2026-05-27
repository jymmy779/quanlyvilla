-- ==========================================================
-- FULL DATABASE SETUP: COMBINED SCHEMA FOR RENTIFY APPLICATION
-- This file consolidates the base Supabase setup and the multi-tenant
-- extensions into a single SQL script. Run the entire content in the
-- Supabase Dashboard -> SQL Editor.
-- ==========================================================

-- ------------------------------------------------------------------
-- 1. Base profiles table and related policies/triggers (from supabase_setup.sql)
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'pending' check (role in ('admin', 'staff', 'pending')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public;

create policy "Cho phép người dùng xem profile cá nhân hoặc admin xem hết"
  on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());

create policy "Cho phép người dùng tự sửa profile cá nhân"
  on public.profiles for update to authenticated using (auth.uid() = id);

create policy "Admin có toàn quyền trên profiles"
  on public.profiles for all to authenticated using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when not exists (select 1 from public.profiles) then 'admin' else 'pending' end
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------
-- 2. Multi‑tenant extensions (from supabase_multi_tenant_setup.sql)
-- ------------------------------------------------------------------

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  business_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép người dùng xem thông tin tenant của mình" ON public.tenants;
CREATE POLICY "Cho phép người dùng xem thông tin tenant của mình"
  ON public.tenants FOR SELECT TO authenticated USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Chủ sở hữu được cập nhật thông tin tenant của mình" ON public.tenants;
CREATE POLICY "Chủ sở hữu được cập nhật thông tin tenant của mình"
  ON public.tenants FOR UPDATE TO authenticated USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'
  );

-- Add tenant_id columns to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.villas ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Extend role enum to support owner
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('owner', 'admin', 'staff', 'pending', 'pending_owner')
);

-- Migrate existing data: first admin becomes owner of a default tenant
DO $$
DECLARE first_admin_id uuid;
BEGIN
  SELECT id INTO first_admin_id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF first_admin_id IS NOT NULL THEN
    INSERT INTO public.tenants (id, name, status) VALUES (first_admin_id, 'Startup Gốc', 'active') ON CONFLICT (id) DO NOTHING;
    UPDATE public.profiles SET tenant_id = COALESCE(tenant_id, first_admin_id);
    UPDATE public.profiles SET role = 'owner' WHERE id = first_admin_id;
    UPDATE public.villas SET tenant_id = COALESCE(tenant_id, first_admin_id);
    UPDATE public.bookings SET tenant_id = COALESCE(tenant_id, first_admin_id);
    UPDATE public.settings SET tenant_id = COALESCE(tenant_id, first_admin_id);
  END IF;
END $$;

-- Composite primary key for settings (key, tenant_id)
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey CASCADE;
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key CASCADE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_tenant_id_pkey') THEN
    ALTER TABLE public.settings ADD CONSTRAINT settings_key_tenant_id_pkey PRIMARY KEY (key, tenant_id);
  END IF;
END $$;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép người dùng xem cấu hình cùng tenant" ON public.settings;
DROP POLICY IF EXISTS "Chủ sở hữu và Admin được sửa cấu hình cùng tenant" ON public.settings;

CREATE POLICY "Cho phép người dùng xem cấu hình cùng tenant"
  ON public.settings FOR SELECT TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Chủ sở hữu và Admin được sửa cấu hình cùng tenant"
  ON public.settings FOR ALL TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()) AND
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('owner', 'admin')
  );

-- Enable RLS on other tables
ALTER TABLE public.villas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies (tenant aware)
DROP POLICY IF EXISTS "Cho phép xem profile cùng Startup" ON public.profiles;
DROP POLICY IF EXISTS "Owner và Admin được quản lý nhân sự cùng Startup" ON public.profiles;

CREATE POLICY "Cho phép xem profile cùng Startup"
  ON public.profiles FOR SELECT TO authenticated USING (
    auth.uid() = id OR tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owner và Admin được quản lý nhân sự cùng Startup"
  ON public.profiles FOR ALL TO authenticated USING (
    auth.uid() = id OR (
      tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) AND
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('owner', 'admin')
    )
  );

-- Villas policies
DROP POLICY IF EXISTS "Cho phép người dùng xem villas cùng tenant" ON public.villas;
DROP POLICY IF EXISTS "Cho phép Admin quản lý villas cùng tenant" ON public.villas;
DROP POLICY IF EXISTS "Cho phép Owner và Admin quản lý villas cùng tenant" ON public.villas;

CREATE POLICY "Cho phép người dùng xem villas cùng tenant"
  ON public.villas FOR SELECT TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Cho phép Owner và Admin quản lý villas cùng tenant"
  ON public.villas FOR ALL TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()) AND
    (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('owner', 'admin')
  );

-- Bookings policies
DROP POLICY IF EXISTS "Cho phép người dùng xem bookings cùng tenant" ON public.bookings;
DROP POLICY IF EXISTS "Cho phép người dùng quản lý bookings cùng tenant" ON public.bookings;

CREATE POLICY "Cho phép người dùng xem bookings cùng tenant"
  ON public.bookings FOR SELECT TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Cho phép người dùng quản lý bookings cùng tenant"
  ON public.bookings FOR ALL TO authenticated USING (
    tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Override handle_new_user for multi‑tenant flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE first_user boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
  IF first_user THEN
    INSERT INTO public.tenants (id, name, status) VALUES (new.id, 'Startup Gốc', 'active') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id) VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      'owner',
      new.id
    );
  ELSE
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id) VALUES (
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- End of full database setup