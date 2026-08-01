# DeltaForce Acc Management

System quản lý tài khoản cày thuê game Delta Force với Next.js 14 App Router, Supabase (PostgreSQL + RLS + RPC), Tailwind CSS và `@dnd-kit` (Kanban Board drag & drop).

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Actions, TypeScript)
- **Database & Auth:** Supabase (PostgreSQL, Storage, RLS, Edge Functions)
- **UI:** Tailwind CSS, Lucide Icons, Glassmorphism design, `@dnd-kit` (Kanban board)
- **State/Math:** `decimal.js` (tính toán tài chính chính xác), local storage (audio player settings)
- **Testing & Tooling:** Vitest, ESLint, TypeScript, PostCSS

## Tính Năng Chính

- **Kanban Board Drag & Drop:** Quản lý quy trình cày thuê tài khoản theo luồng (Kho → Đang cày → Hoàn thành → Đã giao → Đã nhận tiền).
- **Phân công & Phiên làm việc (AE Columns):** Quản lý người cày (Farmer), theo dõi lịch sử và trạng thái tài khoản theo từng AE.
- **Tài chính & Doanh thu:** Tổng hợp thu nhập, trạng thái thanh toán, thống kê tài chính chính xác với `decimal.js`.
- **Quản lý Nguồn (Sources):** Phân loại và lọc tài khoản theo nguồn nhận (Bên A, Bên B, ...).
- **Quản lý Mốc (Milestones & Presets):** Thiết lập mốc level và giá cày thuê linh hoạt.
- **Bảo mật & Storage:** Ảnh kết quả upload trực tiếp với mã hóa signed URL (TTL 5 phút), tự động xóa ảnh hết hạn qua Supabase Edge Function.
- **Audio Player Background:** Trình phát nhạc nền hỗ trợ lưu âm lượng/trạng thái mute vào `localStorage`.
- **Tối ưu Mobile:** Giao diện responsive, nén ảnh client-side tránh lỗi payload 413 trên Vercel.

## Cấu Trúc Dự Án

```text
├── src/
│   ├── app/                 # Next.js App Router (pages, layout, API routes, Server Actions)
│   │   ├── actions/         # Server Actions (accounts, auth, farmers, sources, preset-milestones)
│   │   ├── api/             # Custom API routes (music player route)
│   │   ├── farmers/         # Trang quản lý người cày
│   │   ├── finance/         # Trang quản lý tài chính & báo cáo
│   │   ├── milestones/      # Trang quản lý mốc level
│   │   └── sources/         # Trang quản lý nguồn nhận tài khoản
│   ├── components/          # React components (Board, Modal, Layout, UI, Form)
│   └── lib/                 # Utilities, Supabase clients, TypeScript types, Business logic tests
├── supabase/
│   ├── functions/           # Edge function cleanup ảnh hết hạn (`expire-account-images`)
│   └── migrations/          # SQL database schemas, RPC functions & RLS policies
```

## Thiết Lập & Chạy Cục Bộ

### 1. Cấu hình Supabase

1. Tạo project Supabase mới và bật **Email/Password** provider trong Authentication.
2. Tạo 1 Auth User duy nhất với email cấu hình `SHARED_AUTH_EMAIL` và mật khẩu dùng chung.
3. Chạy các file migration trong `supabase/migrations/` theo thứ tự bằng SQL Editor.
4. Tạo Storage Bucket tên `account-results`, cài đặt **Private**.

### 2. Cấu hình biến môi trường (`.env.local`)

Tạo file `.env.local` từ `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SHARED_AUTH_EMAIL=your_shared_auth_email
CRON_SECRET=your_cron_secret
```

### 3. Chạy ứng dụng

```bash
# Cài đặt dependency
npm install

# Chạy môi trường dev
npm run dev
```

Truy cập `http://localhost:3000/login` và đăng nhập.

## Commands

```bash
npm run dev        # Run dev server
npm run build      # Build production bundle
npm run typecheck  # Validate TypeScript
npm run lint       # Run ESLint
npm test           # Run tests with Vitest
```

## Deployment

Deploy lên **Vercel** và khai báo đầy đủ các biến môi trường từ `.env.local`. Cấu hình Supabase Edge Function `expire-account-images` chạy cron job dọn dẹp Storage theo định kỳ.
