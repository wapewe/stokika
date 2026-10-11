ALTER TABLE field_agents ADD COLUMN IF NOT EXISTS code_of_conduct_explanation TEXT;
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS code_of_conduct_explanation TEXT;
