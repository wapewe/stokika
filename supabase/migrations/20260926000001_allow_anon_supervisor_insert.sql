-- Migration: Allow unauthenticated (anon) users to submit onboarding applications
-- Description: Grants INSERT permissions and creates RLS policies for public form submission
-- Date: 2026-09-26

-- 1. Grant INSERT privileges to the anon role
GRANT INSERT ON public.supervisors TO anon;
GRANT INSERT ON public.field_agents TO anon;

-- 2. Create RLS policies to allow anon inserts
-- For supervisors
CREATE POLICY "Allow public onboarding submissions for supervisors"
ON public.supervisors FOR INSERT
TO anon
WITH CHECK (
    -- Restrict insertions to only 'pending' status
    status = 'pending'
);

-- For field_agents (assuming they follow the same onboarding pattern)
CREATE POLICY "Allow public onboarding submissions for field agents"
ON public.field_agents FOR INSERT
TO anon
WITH CHECK (
    -- Restrict insertions to only 'pending' status
    status = 'pending'
);
