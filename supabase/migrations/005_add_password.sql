-- ============================================================
-- 005_add_password.sql
-- DeltaForce Acc Management – Add password column to accounts
-- ============================================================

-- Add password column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password text;

-- Add comment for documentation
COMMENT ON COLUMN accounts.password IS 'Account password (stored in plaintext for display purposes)';
