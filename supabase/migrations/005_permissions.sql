-- ============================================================
-- 005_permissions.sql
-- DeltaForce: Role-based permissions for RLS bypass
-- ============================================================
-- service_role: bypass RLS, used by Edge Functions
-- authenticated: normal user access via web client
-- ============================================================

-- Cấp quyền cho service_role (dùng bởi Edge Function, bypass RLS)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Cấp quyền cho authenticated (dùng bởi user đăng nhập qua web)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Đảm bảo các bảng/hàm tạo sau này cũng tự động có quyền tương tự
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
alter default privileges in schema public grant all on functions to service_role;
