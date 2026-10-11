-- Migration: Make profile_id nullable in supervisors table
-- Description: Allow supervisor onboarding without an existing profile
-- Date: 2026-09-26

ALTER TABLE supervisors
ALTER COLUMN profile_id DROP NOT NULL;

-- Optionally, we might need to do the same for field_agents if they share the onboarding pattern
ALTER TABLE field_agents
ALTER COLUMN profile_id DROP NOT NULL;
