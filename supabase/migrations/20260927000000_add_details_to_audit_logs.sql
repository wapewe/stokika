-- Migration: Add Details Column to Audit Logs
-- Description: Adds the details column to the audit_logs table for additional JSON data tracking.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

COMMENT ON COLUMN audit_logs.details IS 'Additional contextual details in JSON format';
