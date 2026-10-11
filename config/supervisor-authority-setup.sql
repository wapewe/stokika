-- Supervisor Authority System Setup
-- Run this SQL in Supabase SQL Editor

-- 1. Add assigned_supervisor_id field to field_agents table
ALTER TABLE field_agents 
ADD COLUMN IF NOT EXISTS assigned_supervisor_id UUID REFERENCES supervisors(id);

-- 2. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_field_agents_supervisor 
ON field_agents(assigned_supervisor_id);

-- 3. Create RLS policy for supervisors to view their assigned agents
DROP POLICY IF EXISTS "Supervisors can view assigned agents" ON field_agents;
CREATE POLICY "Supervisors can view assigned agents"
ON field_agents FOR SELECT
TO authenticated
USING (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);

-- 4. Create RLS policy for supervisors to update their assigned agents (limited fields)
DROP POLICY IF EXISTS "Supervisors can update assigned agents" ON field_agents;
CREATE POLICY "Supervisors can update assigned agents"
ON field_agents FOR UPDATE
TO authenticated
USING (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  assigned_supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);

-- 5. Create function to assign agent to supervisor
CREATE OR REPLACE FUNCTION assign_agent_to_supervisor(
  p_agent_id UUID,
  p_supervisor_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Only admin can assign agents to supervisors
  IF auth.uid() != '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid THEN
    RAISE EXCEPTION 'Only admin can assign agents to supervisors';
  END IF;
  
  -- Update field agent with supervisor assignment
  UPDATE field_agents
  SET assigned_supervisor_id = p_supervisor_id,
      updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get supervisor's assigned agents
CREATE OR REPLACE FUNCTION get_supervisor_agents(p_supervisor_user_id UUID)
RETURNS TABLE (
  agent_id UUID,
  agent_number TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  county TEXT,
  approval_status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.agent_number,
    fa.full_name,
    fa.email,
    fa.phone,
    fa.county,
    fa.approval_status,
    fa.created_at
  FROM field_agents fa
  INNER JOIN supervisors s ON fa.assigned_supervisor_id = s.id
  WHERE s.user_id = p_supervisor_user_id
  ORDER BY fa.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create audit log table for supervisor actions
CREATE TABLE IF NOT EXISTS supervisor_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID REFERENCES supervisors(id) NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create index on supervisor_actions
CREATE INDEX IF NOT EXISTS idx_supervisor_actions_supervisor 
ON supervisor_actions(supervisor_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_actions_created 
ON supervisor_actions(created_at DESC);

-- 9. Enable RLS on supervisor_actions
ALTER TABLE supervisor_actions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for supervisor_actions
DROP POLICY IF EXISTS "Admin can view all supervisor actions" ON supervisor_actions;
CREATE POLICY "Admin can view all supervisor actions"
ON supervisor_actions FOR SELECT
TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

DROP POLICY IF EXISTS "Supervisors can view own actions" ON supervisor_actions;
CREATE POLICY "Supervisors can view own actions"
ON supervisor_actions FOR SELECT
TO authenticated
USING (
  supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Supervisors can insert own actions" ON supervisor_actions;
CREATE POLICY "Supervisors can insert own actions"
ON supervisor_actions FOR INSERT
TO authenticated
WITH CHECK (
  supervisor_id IN (
    SELECT id FROM supervisors WHERE user_id = auth.uid()
  )
);

-- Success message
SELECT 'Supervisor authority system setup completed successfully!' as status;
