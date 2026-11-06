# Sưu Tầm Ebook Truyện Tranh — Vercel & Supabase Management

Hệ thống web quản lý tài khoản thành viên, phân quyền truy cập, danh mục truyện tranh (Google Sheets Catalog) và cấu hình sự kiện toàn trang (Site Event Banner) cho hệ sinh thái **Sưu Tầm Ebook Truyện Tranh** (đồng bộ cùng `crawler_pc` và `crawler_mobile`).

---

## Mục lục

1. [Tech Stack](#tech-stack)
2. [Yêu cầu môi trường (Prerequisites)](#yêu-cầu-môi-trường-prerequisites)
3. [Cài đặt dự án chạy Local (Local Setup)](#cài-đặt-dự-án-chạy-local-local-setup)
4. [Kết nối & Cấu hình Supabase](#kết-nối--cấu-hình-supabase)
   - [4.1 Lấy API Keys từ Supabase](#41-lấy-api-keys-từ-supabase)
   - [4.2 Cấu hình Auth Redirect URLs](#42-cấu-hình-auth-redirect-urls)
   - [4.3 Cấu trúc các bảng dữ liệu (Database Schema)](#43-cấu-trúc-các-bảng-dữ-liệu-database-schema)
5. [Các câu lệnh đẩy Schema & Dữ liệu lên Supabase](#các-câu-lệnh-đẩy-schema--dữ-liệu-lên-supabase)
   - [Cách 1: Chạy qua Supabase SQL Editor (Khuyến nghị & Nhanh nhất)](#cách-1-chạy-qua-supabase-sql-editor-khuyến-nghị--nhanh-nhất)
   - [Cách 2: Sử dụng Supabase CLI](#cách-2-sử-dụng-supabase-cli)
   - [Cách 3: Cấp quyền Admin & Khởi tạo dữ liệu ban đầu](#cách-3-cấp-quyền-admin--khởi-tạo-dữ-liệu-ban-đầu)
6. [Kết nối & Deploy lên Vercel](#kết-nối--deploy-lên-vercel)
   - [Cách 1: Deploy qua Vercel Dashboard (Giao diện web)](#cách-1-deploy-qua-vercel-dashboard-giao-diện-web)
   - [Cách 2: Deploy qua Vercel CLI (Dòng lệnh)](#cách-2-deploy-qua-vercel-cli-dòng-lệnh)
7. [Cấu hình Google Sheets Catalog (Tùy chọn)](#cấu-hình-google-sheets-catalog-tùy-chọn)
8. [Các lệnh hữu ích (Available Scripts)](#các-lệnh-hữu-ích-available-scripts)

---

## Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org)
- **UI & Runtime**: React 19, Tailwind CSS v4, [Geist Font](https://vercel.com/font)
- **Database & Auth**: [Supabase](https://supabase.com) (`@supabase/ssr`, `@supabase/supabase-js`)
- **Visuals & Charts**: Recharts v3
- **Testing**: Node.js Native Test Runner (`node --test`)

---

## Yêu cầu môi trường (Prerequisites)

- **Node.js**: Phiên bản 18.18+ hoặc 20+ (Khuyến nghị Node.js 20 LTS hoặc 22+).
- **Trình quản lý gói**: `npm` (hoặc `pnpm` / `yarn`).
- **Tài khoản**:
  - Tài khoản [Supabase](https://supabase.com) (dự án chung với crawler).
  - Tài khoản [Vercel](https://vercel.com).
  - Tài khoản [Google Cloud Platform](https://console.cloud.google.com) có bật Google Sheets API (nếu cần đọc dữ liệu danh mục sách từ Google Sheet).

---

## Cài đặt dự án chạy Local (Local Setup)

### Bước 1: Clone mã nguồn và cài dependencies
```bash
git clone https://github.com/suutamebooktruyentranh2025-hub/supabase-vercel-management.git
cd supabase-vercel-management
npm install
```

### Bước 2: Tạo file cấu hình biến môi trường
Sao chép file `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
```

Mở file `.env.local` và điền các giá trị thực tế:
```ini
# Thông tin public Supabase (dùng chung project với crawler_pc / crawler_mobile)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret Key chỉ chạy phía Server (BẮT BUỘC để phân quyền Admin, tuyệt đối không lộ ra client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Service Account JSON thu gọn trên 1 dòng (dùng để đọc danh mục truyện từ Google Sheets)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# ID Google Sheet danh mục truyện (lấy từ URL: https://docs.google.com/spreadsheets/d/<ID>/edit)
GOOGLE_CATALOG_SHEET_ID=your-google-sheet-id
```

### Bước 3: Chạy Development Server
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

### Bước 4: Kiểm tra kiểm thử (Unit Tests)
```bash
npm test
```
Đảm bảo toàn bộ 127 bài kiểm thử đều vượt qua (100% pass).

---

## Kết nối & Cấu hình Supabase

### 4.1 Lấy API Keys từ Supabase
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án của bạn (ví dụ: `your-project-id`).
3. Điều hướng tới: **Project Settings** (biểu tượng bánh răng góc dưới bên trái) ➔ **API**.
4. Lấy các thông số:
   - **Project URL**: Gán vào `NEXT_PUBLIC_SUPABASE_URL`.
   - **Project API Keys** ➔ `anon / public`: Gán vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Project API Keys** ➔ `service_role` (Bấm *Reveal* để copy): Gán vào `SUPABASE_SERVICE_ROLE_KEY`.

### 4.2 Cấu hình Auth Redirect URLs
Để tính năng đăng nhập Google / Magic Link hoạt động chính xác sau khi chuyển hướng về ứng dụng:
1. Trong Supabase Dashboard, vào mục **Authentication** (biểu tượng người dùng) ➔ **URL Configuration**.
2. Tại mục **Site URL**, nhập URL chính (ví dụ: `http://localhost:3000` hoặc domain Vercel).
3. Tại mục **Redirect URLs**, bấm **Add URL** và thêm:
   - `http://localhost:3000/auth/callback` (Dành cho chạy Local)
   - `https://<tên-domain-của-bạn>.vercel.app/auth/callback` (Dành cho Production trên Vercel)
   - `https://<domain-tùy-chỉnh-nếu-có>/auth/callback`
4. Bấm **Save**.

### 4.3 Cấu trúc các bảng dữ liệu (Database Schema)
Dự án sử dụng các bảng chính sau trong schema `public`:
- `user_profiles`: Thông tin thành viên, bao gồm `id`, `email`, `user_type` (`Free`, `Member`, `Super Member`, `Premium Member`, `Admin`).
- `user_type_allowlist`: Danh sách email chờ phân quyền (nếu user chưa từng đăng nhập vào hệ thống).
- `user_entitlements`: Quản lý các gói dịch vụ và thời hạn (`package_app`, `catalog_y1`, `catalog_y2`, `expires_at`).
- `free_user_credits`: Lượt tải / tokens còn lại dành cho thành viên miễn phí.
- `site_event`: Quản lý sự kiện và nút trên thanh Header (`title`, `start_at`, `end_at`, `url`).

---

## Các câu lệnh đẩy Schema & Dữ liệu lên Supabase

### Cách 1: Chạy qua Supabase SQL Editor (Khuyến nghị & Nhanh nhất)
1. Trong Supabase Dashboard, chọn mục **SQL Editor** ở thanh menu bên trái.
2. Bấm **New query**.
3. Mở file migration trong thư mục dự án: `supabase/migrations/20260916000000_site_event.sql`.
4. Sao chép toàn bộ nội dung và dán vào ô nhập lệnh:
   ```sql
   -- Đổi tên bảng cũ sang site_event nếu có
   do $$
   begin
     if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tong_mon_event')
        and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'site_event') then
       alter table public.tong_mon_event rename to site_event;
     end if;
   end $$;

   -- Tạo bảng site_event
   create table if not exists public.site_event (
     id integer primary key check (id = 1),
     title text not null default 'Bí Cảnh Tông Môn',
     start_at timestamptz not null,
     end_at timestamptz not null,
     url text not null,
     updated_at timestamptz not null default now(),
     updated_by text,
     constraint site_event_range check (end_at > start_at)
   );

   -- Bổ sung cột title nếu bảng đã tồn tại trước đó
   alter table public.site_event
     add column if not exists title text not null default 'Bí Cảnh Tông Môn';

   -- Kích hoạt Row Level Security (RLS)
   alter table public.site_event enable row level security;

   drop policy if exists tong_mon_event_select_public on public.site_event;
   drop policy if exists site_event_select_public on public.site_event;
   create policy site_event_select_public
     on public.site_event
     for select
     to anon, authenticated
     using (true);

   grant select on table public.site_event to anon, authenticated;
   grant all on table public.site_event to service_role;
   ```
5. Bấm nút **Run** (hoặc nhấn `Ctrl + Enter` / `Cmd + Enter`) để áp dụng migration.

---

### Cách 2: Sử dụng Supabase CLI

Nếu bạn muốn quản lý migrations bằng dòng lệnh:

1. **Cài đặt & Đăng nhập Supabase CLI**:
   ```bash
   npx supabase login
   ```
   (Trình duyệt sẽ mở để cấp token xác thực cá nhân).

2. **Liên kết dự án cục bộ với Supabase Cloud**:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
   *(Lấy `<your-project-ref>` từ URL Dashboard, ví dụ: `your-project-id`)*.

3. **Đẩy toàn bộ migrations lên cơ sở dữ liệu Supabase**:
   ```bash
   npx supabase db push
   ```
   Lệnh này sẽ tự động chạy các tệp SQL trong thư mục `supabase/migrations/` chưa được áp dụng.

---

### Cách 3: Cấp quyền Admin & Khởi tạo dữ liệu ban đầu

#### Cấp quyền Admin cho tài khoản của bạn:
Sau khi đăng nhập tài khoản bằng Google lần đầu tiên, hãy mở **SQL Editor** trong Supabase và chạy lệnh sau để thăng cấp tài khoản thành `Admin`:
```sql
update public.user_profiles
set user_type = 'Admin'
where email = 'email_cua_ban@gmail.com';
```

#### Thêm trước email vào danh sách phân quyền (Allowlist):
Nếu người dùng chưa đăng nhập, bạn có thể thêm trước quyền cho họ qua SQL:
```sql
insert into public.user_type_allowlist (email, user_type)
values ('thanhvien@gmail.com', 'Member')
on conflict (email) do update set user_type = excluded.user_type;
```
*(Khi người dùng này đăng nhập lần đầu, hệ thống sẽ tự động gán rank tương ứng).*

---

## Kết nối & Deploy lên Vercel

### Cách 1: Deploy qua Vercel Dashboard (Giao diện web)

1. Đăng nhập vào [Vercel](https://vercel.com).
2. Chọn **Add New...** ➔ **Project**.
3. Chọn repository Git của dự án (`supabase-vercel-management`).
4. Tại mục **Configure Project**:
   - **Framework Preset**: Chọn **Next.js**.
   - **Root Directory**: Để trống `./`.
   - **Build Command**: `next build` (mặc định).
   - **Install Command**: `npm install` (mặc định).
5. Mở rộng mục **Environment Variables** và nhập đầy đủ các biến môi trường:
   | Tên biến | Giá trị |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1Ni...` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1Ni...` (Secret) |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` | `{"type":"service_account",...}` |
   | `GOOGLE_CATALOG_SHEET_ID` | ID bảng Google Sheet danh mục (Bắt buộc nếu dùng Catalog) |
6. **Lưu ý về nhánh Production**: Nếu repository của bạn đặt nhánh chính là `master`, hãy vào **Settings** ➔ **Git** ➔ tại dòng **Production Branch** đổi từ `main` thành `master` ➔ Bấm **Save**.
7. Bấm nút **Deploy**.
8. Sau khi Vercel build thành công, copy URL trang web (ví dụ: `https://my-app.vercel.app`) và thêm vào **Redirect URLs** trên Supabase (xem mục 4.2).

---

### Cách 2: Deploy qua Vercel CLI (Dòng lệnh)

1. **Cài đặt & Đăng nhập Vercel**:
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Liên kết và cấu hình biến môi trường**:
   ```bash
   vercel link
   ```
   Thêm biến môi trường lên Vercel:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
   vercel env add GOOGLE_CATALOG_SHEET_ID
   ```

3. **Kéo biến môi trường về máy (nếu cần)**:
   ```bash
   vercel env pull .env.local
   ```

4. **Triển khai ứng dụng**:
   - Triển khai bản xem trước (Preview):
     ```bash
     vercel
     ```
   - Triển khai bản chính thức (Production):
     ```bash
     vercel --prod
     ```

---

## Cấu hình Google Sheets Catalog (Tùy chọn)

Nếu bạn sử dụng tính năng duyệt danh mục truyện lấy dữ liệu trực tiếp từ Google Sheets:

1. Tạo một **Service Account** trong Google Cloud Console.
2. Bật API **Google Sheets API**.
3. Tạo và tải về file JSON key của Service Account.
4. Mở Google Sheet chứa danh mục truyện, bấm **Share** và cấp quyền **Viewer** cho email của Service Account (dạng: `xxx@yyy.iam.gserviceaccount.com`).
5. Thu gọn toàn bộ nội dung file JSON key thành 1 dòng duy nhất và dán vào biến `GOOGLE_SERVICE_ACCOUNT_JSON` trong `.env.local` / Vercel.
6. Sao chép ID của Google Sheet từ thanh địa chỉ trình duyệt (chuỗi ký tự nằm giữa `/d/` và `/edit`) và dán vào biến `GOOGLE_CATALOG_SHEET_ID`.

---

## Các lệnh hữu ích (Available Scripts)

Trong thư mục dự án, bạn có thể chạy:

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run dev` | Khởi chạy server phát triển local tại cổng `http://localhost:3000` |
| `npm run build` | Biên dịch bản dựng tối ưu hóa cho môi trường Production |
| `npm run start` | Khởi chạy server production sau khi đã build |
| `npm test` | Chạy toàn bộ bộ kiểm thử tự động (127 unit tests) qua `node --test` |
| `npm run test:security-validators` | Chạy kiểm thử xác thực cấu trúc báo cáo và sổ cái an ninh (65 tests) |
| `npm run lint` | Chạy ESLint kiểm tra lỗi cú pháp và tiêu chuẩn mã nguồn |
