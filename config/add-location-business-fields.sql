-- Add location and business fields to tables
-- Run this in Supabase SQL Editor

-- Add fields to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100),
ADD COLUMN IF NOT EXISTS center VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_reg_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_kra_pin VARCHAR(20);

-- Add fields to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS county VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100),
ADD COLUMN IF NOT EXISTS town VARCHAR(100),
ADD COLUMN IF NOT EXISTS center VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_reg_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_kra_pin VARCHAR(20);

-- Add fields to field_agents table (if not exists)
ALTER TABLE field_agents 
ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(20);

-- Add fields to supervisors table
ALTER TABLE supervisors 
ADD COLUMN IF NOT EXISTS sub_county VARCHAR(100),
ADD COLUMN IF NOT EXISTS town VARCHAR(100),
ADD COLUMN IF NOT EXISTS center VARCHAR(100),
ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(20);

-- Verify columns added
SELECT 'Vendors columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' AND column_name IN ('sub_county', 'center', 'business_reg_number', 'business_kra_pin')
UNION ALL
SELECT 'Suppliers columns', column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'suppliers' AND column_name IN ('county', 'sub_county', 'town', 'center', 'business_reg_number', 'business_kra_pin')
UNION ALL
SELECT 'Field Agents columns', column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'field_agents' AND column_name = 'kra_pin'
UNION ALL
SELECT 'Supervisors columns', column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'supervisors' AND column_name IN ('sub_county', 'town', 'center', 'kra_pin');
