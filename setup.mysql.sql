-- ==========================================================
-- MySQL SETUP SCRIPT FOR RENTIFY APPLICATION
-- Run this file in your MySQL database (e.g., via phpMyAdmin,
-- MySQL Workbench, or CLI: mysql -u root -p < setup.mysql.sql)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS rentify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rentify;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  business_type VARCHAR(100),
  status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  role ENUM('owner', 'admin', 'staff', 'pending', 'pending_owner') NOT NULL DEFAULT 'pending',
  tenant_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Villas table
CREATE TABLE IF NOT EXISTS villas (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  location TEXT,
  tenant_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  villa_id CHAR(36) NOT NULL,
  tenant_id CHAR(36),
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (villa_id) REFERENCES villas(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Settings table (composite key: key + tenant_id)
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) NOT NULL,
  value TEXT,
  tenant_id CHAR(36) NOT NULL,
  PRIMARY KEY (`key`, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_villas_tenant_id ON villas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);

-- Insert default settings for new tenants (handled in app code)