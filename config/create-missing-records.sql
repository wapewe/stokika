-- Create missing records for orphaned users
-- Run this in Supabase SQL Editor

-- Create supplier record for orphaned supplier
INSERT INTO suppliers (
    user_id,
    company_name,
    contact_person,
    email,
    phone,
    years_in_business,
    number_of_employees,
    counties,
    categories,
    minimum_order_quantity,
    payment_terms,
    accepts_credit,
    status,
    created_at
)
SELECT 
    u.id,
    u.name,
    u.name,
    u.email,
    COALESCE(u.phone, 'N/A'),
    '1-2 years',
    '1-5',
    'Nairobi',
    'General',
    '1',
    'Cash on delivery',
    'no',
    'active',
    u.created_at
FROM users u
LEFT JOIN suppliers s ON u.id = s.user_id
WHERE u.user_type = 'supplier' AND s.id IS NULL;

-- Create vendor records for orphaned vendors
INSERT INTO vendors (
    user_id,
    business_name,
    email,
    phone,
    county,
    town,
    status,
    created_at
)
SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(u.phone, 'N/A'),
    'N/A',
    'N/A',
    'active',
    u.created_at
FROM users u
LEFT JOIN vendors v ON u.id = v.user_id
WHERE u.user_type = 'vendor' AND v.id IS NULL;

-- Create field_agent records for orphaned field agents
INSERT INTO field_agents (
    user_id,
    full_name,
    email,
    phone,
    county,
    sub_county,
    town,
    ward,
    id_number,
    agent_number,
    status,
    approval_status,
    interview_status,
    kin_name,
    kin_relationship,
    kin_phone,
    referee1_name,
    referee1_phone,
    referee1_relationship,
    referee2_name,
    referee2_phone,
    referee2_relationship,
    sme_experience,
    created_at
)
SELECT 
    u.id,
    u.name,
    u.email,
    COALESCE(u.phone, 'N/A'),
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'AG-' || SUBSTRING(REPLACE(u.id::text, '-', ''), 1, 17),
    'approved',
    'approved',
    'not_interviewed',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'Admin created account',
    u.created_at
FROM users u
LEFT JOIN field_agents fa ON u.id = fa.user_id
WHERE u.user_type = 'field_agent' AND fa.id IS NULL;

-- Verify
SELECT 'Fixed!' as status, COUNT(*) as orphaned_suppliers FROM users u LEFT JOIN suppliers s ON u.id = s.user_id WHERE u.user_type = 'supplier' AND s.id IS NULL
UNION ALL
SELECT 'Fixed!', COUNT(*) FROM users u LEFT JOIN vendors v ON u.id = v.user_id WHERE u.user_type = 'vendor' AND v.id IS NULL
UNION ALL
SELECT 'Fixed!', COUNT(*) FROM users u LEFT JOIN field_agents fa ON u.id = fa.user_id WHERE u.user_type = 'field_agent' AND fa.id IS NULL;
