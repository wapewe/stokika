-- Setup Admin User Metadata
-- This ensures admin users have proper metadata in auth.users

-- 1. First, update existing admin user or create if doesn't exist
-- Replace with your actual admin email
INSERT INTO users (name, email, user_type, role, status, created_at)
VALUES ('Admin User', 'stokikakenya@gmail.com', 'admin', 'admin', 'active', NOW())
ON CONFLICT (email) 
DO UPDATE SET 
    user_type = 'admin',
    role = 'admin',
    status = 'active';

-- 2. Create a function to sync user metadata on login
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update auth.users metadata with user_type and role from users table
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{user_type}',
        to_jsonb((SELECT user_type FROM public.users WHERE id = NEW.id))
    )
    WHERE id = NEW.id;
    
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb((SELECT role FROM public.users WHERE id = NEW.id))
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to sync metadata on user insert/update
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON public.users;
CREATE TRIGGER sync_user_metadata_trigger
    AFTER INSERT OR UPDATE OF user_type, role ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_metadata();

-- 4. Manually sync existing admin users
DO $$
DECLARE
    admin_record RECORD;
BEGIN
    FOR admin_record IN 
        SELECT id, user_type, role FROM public.users WHERE user_type = 'admin' OR role = 'admin'
    LOOP
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{user_type}',
                to_jsonb(admin_record.user_type)
            ),
            '{role}',
            to_jsonb(admin_record.role)
        )
        WHERE id = admin_record.id;
    END LOOP;
END $$;

-- 5. Verify the metadata was set
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'user_type' as metadata_user_type,
    au.raw_user_meta_data->>'role' as metadata_role,
    u.user_type as table_user_type,
    u.role as table_role
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.user_type = 'admin' OR u.role = 'admin';
