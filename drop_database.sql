-- CẢNH BÁO: Lệnh này sẽ XÓA TOÀN BỘ dữ liệu. Cẩn thận khi chạy trên Production!

-- 1. Drop Tables (thứ tự từ con đến cha, dùng cascade cho an toàn)
drop table if exists holder_sessions cascade;
drop table if exists account_milestones cascade;
drop table if exists accounts cascade;
drop table if exists farmers cascade;
drop table if exists sources cascade;

-- 2. Drop Enum Type
drop type if exists account_status cascade;

-- 3. Drop Functions (Triggers sẽ tự mất khi bảng bị xoá)
drop function if exists touch_updated_at() cascade;
drop function if exists deltaforce_protect_accounts() cascade;
drop function if exists deltaforce_protect_holder_sessions() cascade;
drop function if exists move_account cascade;
drop function if exists transition_account cascade;
drop function if exists upload_account_image cascade;
drop function if exists clear_account_image cascade;
drop function if exists create_account_with_milestones cascade;
