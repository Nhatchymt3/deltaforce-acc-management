# DeltaForce Acc Management

MVP quản lý acc cày thuê bằng Next.js App Router, Supabase và Kanban dnd-kit.

## Thiết lập Supabase

1. Tạo project Supabase và bật Email/password trong Authentication.
2. Tạo một Auth user duy nhất, ví dụ `SHARED_AUTH_EMAIL`, với mật khẩu dùng chung.
   **Không tạo bảng `users` hoặc `members`. AE columns được derive trong UI từ
   `accounts.current_holder` UNION `DISTINCT holder_sessions.holder_name`.**
3. Sao chép `.env.example` thành `.env.local`, điền URL, anon key, service-role key và email dùng chung.
   **Không commit file này.**
4. Chạy migration trong SQL Editor theo thứ tự:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_hardening.sql` ← bắt buộc
5. Tạo bucket Storage tên `account-results`, đặt **Private** (không public).
   Policies đã được thêm trong migration `002_hardening.sql`.

## Kiến trúc bảo mật (Hardening)

### 1. Cột được bảo vệ (Rule 1)
Các cột sau **không bao giờ** được ghi qua direct `UPDATE/INSERT/DELETE`
từ client/server code:

- `status`, `position`, `current_holder`, `completed_at`, `delivered_at`,
  `paid_at`, `image_url`, `image_expires_at`, `target_milestone_id`,
  `amount_received`, `current_level`

> **Lưu ý:** `source` đã **không còn** trong danh sách protected sau migration 004
> (được phép update trực tiếp vì là uuid FK).

Mọi thay đổi phải qua các RPC có `SECURITY DEFINER`:
`move_account`, `transition_account`, `upload_account_image`,
`clear_account_image`, `create_account_with_milestones`.

### 2. Trigger bảo vệ (002_hardening.sql)
`deltaforce_accounts_protect` – `BEFORE UPDATE` trên `accounts`.
- Kiểm tra `current_setting('deltaforce.rpc_call', true) = 'true'`.
- Nếu vi phạm → `raise exception P0003 'Protected columns...'`.
- Mechanism documented in migration file header.

### 3. FSM được thực thi
```
kho → dang_cay → done → da_giao_cho_ben_thu → da_nhan_tien
```
Các RPC kiểm tra `status` trước mỗi transition. Cards ở trạng thái
`done`, `da_giao_cho_ben_thu`, `da_nhan_tien` không thể kéo/drop.

### 4. Storage `account-results` – PRIVATE
Chỉ role `authenticated` được SELECT/INSERT/UPDATE/DELETE.
UI dùng signed URL (TTL ≤ 5 phút) từ server helper.
Edge Function chỉ xóa Storage objects + gọi `clear_account_image`,
**không xóa bất kỳ row nghiệp vụ nào**.

### 5. Tiền tệ (bigint + Decimal.js)
`amount_received` lưu dạng `bigint` (VND nguyên). Mọi phép toán tài chính
dùng `decimal.js` (`Decimal`). Không dùng `Number()` cho sums/splits.

## Migrations

| File | Mục đích |
|------|----------|
| `001_initial_schema.sql` | Bảng, RLS policies, RPC ban đầu |
| `002_hardening.sql` | Trigger bảo vệ, Storage policies, FK fix, RPC nâng cao |
| `003_rpc_tests.sql` | **Docstring-only** – manual verification only |
| `004_sources_and_text_price.sql` | Bảng `sources` CRUD, `accounts.source` → uuid FK, `milestone.price` → text |

### Migration 004 — Dynamic Sources + Text Price

- Tạo bảng `sources (id uuid, name text UNIQUE, created_at timestamptz)`, seed 3 dòng mặc định (Bên A, Bên B, Bên C)
- Đổi `accounts.source` từ `text check(...)` → `uuid REFERENCES sources(id)`, backfill data cũ
- Đổi `account_milestones.price` từ `bigint` → `text` (lưu nguyên như người dùng nhập: '20m', '500k', '4.5m')
- Cập nhật `create_account_with_milestones` để nhận `source uuid` và `price text`
- Sửa trigger `deltaforce_accounts_protect`: bỏ `source` khỏi protected columns

### Mốc Level — Định dạng hiển thị

Mốc acc hiển thị dạng `lv${level}-${price}`, ví dụ: `lv30-20m`, `lv40-500k`. Không parse hay conversion giá tiền — price lưu nguyên text người dùng nhập.

## Server Actions (Next.js)

### Account Actions

| Action | RPC | Mô tả |
|--------|-----|--------|
| `moveAccount(...)` | `move_account` | Chuyển acc giữa AE columns |
| `transitionAccount(...)` | `transition_account` | FSM transitions (done, deliver, pay, update_level) |
| `createAccountWithMilestones(...)` | `create_account_with_milestones` | Tạo acc + milestones atomically |
| `uploadAccountImage(...)` | `upload_account_image` | Upload ảnh, validate ≤5 MB, image/* |
| `clearAccountImage(...)` | `clear_account_image` | Xóa signed URL khỏi DB |
| `getSignedImageUrl(...)` | — | Tạo signed URL (TTL 5 min) |

### Source Actions (`src/app/actions/sources.ts`)

| Action | Mô tả |
|--------|--------|
| `getSources()` | Lấy danh sách nguồn (sắp xếp theo tên) |
| `createSource(name)` | Thêm nguồn mới (throw nếu trùng tên) |
| `updateSource(id, name)` | Cập nhật tên nguồn (throw nếu trùng) |
| `deleteSource(id)` | Xóa nguồn (throw nếu còn tài khoản) |

### Quản lý Nguồn

Trang `/sources` cho phép CRUD nguồn tài khoản (glassmorphism UI). Filter nguồn trên board động theo `accounts.source`. Dropdown chọn nguồn trong form tạo acc được load từ DB.

Tất cả actions gọi `revalidatePath('/')` và `revalidatePath('/finance')` sau thành công.

## Chạy cục bộ (Windows PowerShell)

```powershell
Copy-Item .env.example .env.local
# Điền các biến trong .env.local
npm install
npm run dev
```

Mở `http://localhost:3000/login` và đăng nhập bằng mật khẩu dùng chung.

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Manual RPC Verification

Chạy các test trong `supabase/migrations/003_rpc_tests.sql` bằng SQL Editor
để xác minh:
1. `version_conflict` được raise đúng cách
2. FSM order được thực thi
3. Trigger chặn direct UPDATE của protected columns
4. `deliver` reject cross-account milestones

## Cron và Edge Function

Cài Supabase CLI, đăng nhập và link project. Đặt `CRON_SECRET` cùng service-role
secret trong function secrets, sau đó deploy:

```powershell
supabase functions deploy expire-account-images
```

Function chạy mỗi giờ, batch tối đa 200 rows:
1. Gọi `storage.remove()` để xóa object đã hết hạn.
2. Gọi `clear_account_image` RPC (retry once on `version_conflict`).
3. Log số rows processed và skipped paths.
4. **Không xóa row nào** từ `accounts`, `account_milestones`, `holder_sessions`.

## Deploy Vercel

Import repository vào Vercel, chọn Next.js và cấu hình:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, không bundle vào client)
- `SHARED_AUTH_EMAIL`
- `CRON_SECRET`

## Đổi mật khẩu dùng chung

Đổi password của Auth user trong Supabase Dashboard hoặc Admin API,
cập nhật secret `SHARED_AUTH_EMAIL` nếu email thay đổi,
rồi đăng xuất các phiên cũ và triển khai lại Vercel nếu secret đã thay đổi.
