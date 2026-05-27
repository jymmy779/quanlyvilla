-- ==========================================================
-- PURE SQL SETUP: Self-contained schema without Supabase Auth
-- ==========================================================
-- This script creates a standalone PostgreSQL schema that
-- does NOT depend on Supabase auth.users or RLS.
-- Authentication is handled server-side via bcrypt + JWT.
-- Run this in your PostgreSQL database (Supabase SQL Editor
-- or direct psql).
-- ==========================================================

-- 1. Create custom user table (replaces auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create tenants table (same as before)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  business_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create profiles table (FK to users instead of auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'pending' CHECK (role IN ('owner', 'admin', 'staff', 'pending', 'pending_owner')),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create villas table
CREATE TABLE IF NOT EXISTS public.villas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text DEFAULT '',
  description text DEFAULT '',
  price numeric(12,2) DEFAULT 0,
  images text[] DEFAULT '{}',
  amenities text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  bedrooms integer DEFAULT 0,
  bathrooms integer DEFAULT 0,
  capacity_adults integer DEFAULT 0,
  capacity_children integer DEFAULT 0,
  villa_details jsonb DEFAULT '[]',
  map_link text DEFAULT '',
  map_embed_url text DEFAULT '',
  monthly_prices jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid REFERENCES public.villas(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer DEFAULT 1,
  children integer DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  deposit_amount numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'checked_in', 'checked_out', 'cancelled', 'completed')),
  notes text DEFAULT '',
  additional_services jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create settings table (composite PK: key + tenant_id)
CREATE TABLE IF NOT EXISTS public.settings (
  key text NOT NULL,
  value text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  PRIMARY KEY (key, tenant_id)
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_villas_tenant_id ON public.villas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_villa_id ON public.bookings(villa_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 8. Auto-create profile when a user is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- First user becomes owner and gets a tenant
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    INSERT INTO public.tenants (id, name, status)
    VALUES (NEW.id, 'Startup Gốc', 'active');
    
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id)
    VALUES (
      NEW.id,
      NEW.email,
      '',
      '',
      'owner',
      NEW.id
    );
  ELSE
    INSERT INTO public.profiles (id, email, full_name, phone, role, tenant_id)
    VALUES (
      NEW.id,
      NEW.email,
      '',
      '',
      'pending',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Update updated_at column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS on_user_updated ON public.users;
CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- 10. Helper: check if a user has an active role
CREATE OR REPLACE FUNCTION public.is_active_role(role text)
RETURNS boolean AS $$
BEGIN
  RETURN role IN ('owner', 'admin', 'staff');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- 11. Helper: get users by tenant
CREATE OR REPLACE FUNCTION public.get_tenant_users(p_tenant_id uuid)
RETURNS SETOF public.profiles AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.profiles WHERE tenant_id = p_tenant_id ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Seed data: Add default settings keys for each tenant
CREATE OR REPLACE FUNCTION public.seed_default_settings(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.settings (key, value, tenant_id)
  VALUES 
    ('site_name', 'Rentify', p_tenant_id),
    ('currency', 'VND', p_tenant_id),
    ('timezone', 'Asia/Ho_Chi_Minh', p_tenant_id),
    ('booking_prefix', 'BK-', p_tenant_id)
  ON CONFLICT (key, tenant_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;