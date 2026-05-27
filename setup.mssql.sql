-- ==========================================================
-- MSSQL (SQL Server) SETUP SCRIPT FOR RENTIFY APPLICATION
-- Run this file in SQL Server Management Studio (SSMS),
-- Azure Data Studio, or via sqlcmd.
-- ==========================================================

-- Create database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'rentify')
BEGIN
    CREATE DATABASE rentify;
END
GO

USE rentify;
GO

-- Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE()
    );
END
GO

-- Tenants table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tenants' AND xtype='U')
BEGIN
    CREATE TABLE tenants (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        address NVARCHAR(MAX),
        phone NVARCHAR(50),
        business_type NVARCHAR(100),
        status NVARCHAR(50) NOT NULL DEFAULT 'pending'
            CHECK (status IN ('active', 'pending', 'suspended')),
        created_at DATETIME2 DEFAULT GETUTCDATE()
    );
END
GO

-- Profiles table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='profiles' AND xtype='U')
BEGIN
    CREATE TABLE profiles (
        id NVARCHAR(36) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255),
        phone NVARCHAR(50),
        role NVARCHAR(50) NOT NULL DEFAULT 'pending'
            CHECK (role IN ('owner', 'admin', 'staff', 'pending', 'pending_owner')),
        tenant_id NVARCHAR(36),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );
END
GO

-- Villas table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='villas' AND xtype='U')
BEGIN
    CREATE TABLE villas (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        location NVARCHAR(MAX),
        tenant_id NVARCHAR(36),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
END
GO

-- Bookings table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bookings' AND xtype='U')
BEGIN
    CREATE TABLE bookings (
        id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
        villa_id NVARCHAR(36) NOT NULL,
        tenant_id NVARCHAR(36),
        start_date DATETIME2 NOT NULL,
        end_date DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (villa_id) REFERENCES villas(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
END
GO

-- Settings table (composite key: key + tenant_id)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='settings' AND xtype='U')
BEGIN
    CREATE TABLE settings (
        [key] NVARCHAR(255) NOT NULL,
        value NVARCHAR(MAX),
        tenant_id NVARCHAR(36) NOT NULL,
        PRIMARY KEY ([key], tenant_id),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );
END
GO

-- Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_profiles_tenant_id')
    CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_villas_tenant_id')
    CREATE INDEX idx_villas_tenant_id ON villas(tenant_id);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bookings_tenant_id')
    CREATE INDEX idx_bookings_tenant_id ON bookings(tenant_id);
GO

-- Insert default settings for new tenants (handled in app code)