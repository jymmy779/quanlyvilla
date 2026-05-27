# Rentify - Quản lý Villa & Booking

Hệ thống quản lý cho thuê villa nhiều chủ (multi-tenant) với Next.js. Hỗ trợ **PostgreSQL**, **MySQL** và **MSSQL (SQL Server)**.

## Tính năng

- **Đa chủ (Multi-tenant)** — Mỗi chủ sở hữu nhiều villa, có tài khoản riêng biệt
- **Quản lý Villa** — Thêm, sửa, xoá villa; quản lý thông tin, giá cả, lịch
- **Đặt phòng (Booking)** — Xem lịch rảnh, đặt phòng, quản lý trạng thái
- **Người dùng & Phân quyền** — Owner, Admin, Staff với quyền hạn khác nhau
- **Báo cáo** — Xuất báo cáo doanh thu, thống kê đặt phòng (Word, PDF)
- **Giao diện responsive** — Hỗ trợ mobile & desktop

## Công nghệ sử dụng

| Frontend | Backend / Database |
|----------|-------------------|
| Next.js 16 (App Router) | PostgreSQL / MySQL / MSSQL |
| TypeScript | Knex.js (query builder) |
| Tailwind CSS | JWT authentication (jsonwebtoken + bcryptjs) |
| Mermaid (ER diagram) | Multi-tenant schema |

## Cấu trúc thư mục

```
src/
├── app/               # Next.js App Router pages
│   ├── bookings/      # Trang quản lý booking
│   ├── villas/        # Trang quản lý villa
│   ├── login/         # Đăng nhập
│   ├── register/      # Đăng ký tài khoản
│   ├── settings/      # Cài đặt hệ thống
│   ├── calendar/      # Xem lịch
│   └── pricing/       # Quản lý giá
├── components/        # Shared components
├── context/           # React context (auth, theme, notification)
├── lib/               # Utilities & helpers
│   ├── db.ts          # Knex database client (multi-dialect)
│   └── auth.ts        # JWT authentication helpers
├── data/              # Dữ liệu mẫu & seed
└── types/             # TypeScript types
```

## Cài đặt

### Yêu cầu

- Node.js 18+
- Một trong các database: PostgreSQL 14+, MySQL 8+, hoặc SQL Server 2019+
- npm

### Các bước

```bash
# 1. Clone repo
git clone https://github.com/jymmy779/quanlyvilla.git
cd rentify

# 2. Cài dependencies
npm install

# 3. Chọn database và tạo database
#    PostgreSQL: Tạo database mới (ví dụ: rentify)
#    MySQL:      CREATE DATABASE rentify CHARACTER SET utf8mb4;
#    MSSQL:      CREATE DATABASE rentify;

# 4. Chạy migration tương ứng
#    PostgreSQL: psql -U postgres -d rentify -f pure_sql_setup.sql
#    MySQL:      mysql -u root -p rentify < setup.mysql.sql
#    MSSQL:      sqlcmd -S localhost -d rentify -i setup.mssql.sql

# 5. Tạo file .env.local
cp .env.example .env.local

# 6. Cấu hình .env.local (xem hướng dẫn bên dưới)

# 7. Chạy dev server
npm run dev
```

### Cấu hình database

Mở file `.env.local` và cấu hình theo database bạn chọn:

**PostgreSQL (mặc định):**
```
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rentify
```

**MySQL:**
```
DB_CLIENT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=rentify
```

**MSSQL (SQL Server):**
```
DB_CLIENT=mssql
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=sapassword
DB_NAME=rentify
```

### Tài khoản mặc định

Sau khi chạy migration (PostgreSQL `pure_sql_setup.sql`), các tài khoản sau được tạo sẵn:

| Email | Password | Vai trò |
|-------|----------|---------|
| admin@rentify.com | Admin123! | admin (thuộc tenant mặc định) |
| owner@rentify.com | Owner123! | owner (chủ villa) |
| staff@rentify.com | Staff123! | staff (nhân viên) |

> **Lưu ý:** `setup.mysql.sql` và `setup.mssql.sql` chỉ tạo cấu trúc bảng, chưa có seed data. Bạn cần đăng ký tài khoản đầu tiên qua giao diện để tạo tenant mặc định.

## Database

### Sơ đồ ER

![ER Diagram](public/Screenshot%202026-05-27%20230649.png)

Hoặc mở `render-erd.html` trong trình duyệt để xem tương tác (có thanh trượt phóng to và nút tải PNG).

### Entities chính

| Table | Mô tả |
|-------|-------|
| `tenants` | Chủ sở hữu (mỗi tenant là một chủ villa) |
| `profiles` | Hồ sơ người dùng (liên kết với users) |
| `villas` | Các villa / căn hộ cho thuê |
| `bookings` | Đặt phòng |
| `settings` | Cài đặt (key-value theo tenant) |

### Cấu trúc schema

Database sử dụng **Knex.js** làm query builder, hỗ trợ 3 dialect:

- **PostgreSQL** — `pure_sql_setup.sql`
- **MySQL** — `setup.mysql.sql`
- **MSSQL** — `setup.mssql.sql`

Tất cả API routes đều dùng Knex query builder nên code hoàn toàn tương thích giữa các database.

### File migration

| File | Mô tả |
|------|-------|
| `pure_sql_setup.sql` | Full setup PostgreSQL (tables, triggers, seed data) |
| `full_database_setup.sql` | Database schema đầy đủ (PostgreSQL) |
| `supabase_setup.sql` | Schema cho Supabase (PostgreSQL) |
| `setup.mysql.sql` | Schema cho MySQL |
| `setup.mssql.sql` | Schema cho MSSQL |

## API Routes

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/register` | Đăng ký tài khoản mới |
| POST | `/api/auth/register-startup` | Đăng ký startup (chủ villa mới) |
| POST | `/api/auth/approve-startup` | Duyệt tài khoản startup (admin) |
| POST | `/api/auth/change-password` | Đổi mật khẩu |
| POST | `/api/auth/reset-password-request` | Yêu cầu đặt lại mật khẩu |
| GET | `/api/profile` | Lấy thông tin profile |
| PATCH | `/api/profile` | Cập nhật profile |
| GET | `/api/admin/users` | Danh sách người dùng (admin) |
| POST | `/api/admin/create-user` | Tạo người dùng mới (admin) |
| PATCH | `/api/admin/manage-user` | Cập nhật / vô hiệu hoá người dùng (admin) |
| POST | `/api/admin/reset-password` | Admin đặt lại mật khẩu cho user |
| GET | `/api/tenants/[id]` | Lấy thông tin tenant |

## Biên dịch & Triển khai

```bash
# Build production
npm run build

# Start production server
npm start
```

## Biến môi trường

| Variable | Mô tả |
|----------|-------|
| `DB_CLIENT` | Database dialect: `pg`, `mysql`, hoặc `mssql` |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `JWT_SECRET` | Secret key dùng để ký JWT tokens |
| `NEXT_PUBLIC_APP_URL` | URL của ứng dụng (mặc định: `http://localhost:3000`) |

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run start` | Start production server |
| `npm run lint` | Kiểm tra lint |
| `generate_report.py` | Sinh báo cáo Word |
| `fill_report.py` | Điền dữ liệu vào template report |
| `read_docx.py` | Đọc và extract nội dung file .docx |

## License

MIT