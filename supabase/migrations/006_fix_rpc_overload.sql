-- ============================================================
-- 006_fix_rpc_overload.sql
-- DeltaForce: Drop stale create_account_with_milestones overload
-- ============================================================
-- Migration 004 changed p_source from text to uuid, creating a new
-- overload instead of replacing the old one. This causes PostgREST
-- to fail with "Could not choose the best candidate function".
-- Drop the old text-based signature to resolve the ambiguity.

DROP FUNCTION IF EXISTS create_account_with_milestones(text, text, text, jsonb, text);
