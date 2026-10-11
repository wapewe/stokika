-- Comprehensive Onboarding System Schema
-- Run this in Supabase SQL Editor
-- PREREQUISITE: unified-database-schema.sql must be run first

-- Check if users table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'ERROR: users table does not exist. Please run unified-database-schema.sql first.';
    END IF;
END $$;

-- 1. Onboarding Steps Table
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(50) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    step_order INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, step_name)
);

-- 2. Training Modules Table
CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content TEXT,
    video_url VARCHAR(500),
    duration_minutes INTEGER,
    user_type VARCHAR(50) NOT NULL,
    module_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Training Progress Table
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    quiz_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- 4. Document Uploads Table
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('id_card', 'certificate', 'kra_pin', 'photo', 'contract', 'other')),
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Performance Metrics Table
CREATE TABLE IF NOT EXISTS onboarding_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    metric_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Onboarding Notifications Table
CREATE TABLE IF NOT EXISTS onboarding_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. First Assignment Tracking Table
CREATE TABLE IF NOT EXISTS first_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL,
    assignment_description TEXT,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user ON onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_user ON onboarding_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_metrics_user ON onboarding_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_notifications_user ON onboarding_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_first_assignments_user ON first_assignments(user_id);

-- Enable RLS
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own onboarding steps" ON onboarding_steps;
CREATE POLICY "Users can view own onboarding steps" ON onboarding_steps FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding steps" ON onboarding_steps;
CREATE POLICY "Users can update own onboarding steps" ON onboarding_steps FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all onboarding steps" ON onboarding_steps;
CREATE POLICY "Admins can manage all onboarding steps" ON onboarding_steps FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Everyone can view training modules" ON training_modules;
CREATE POLICY "Everyone can view training modules" ON training_modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage training modules" ON training_modules;
CREATE POLICY "Admins can manage training modules" ON training_modules FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can view own training progress" ON training_progress;
CREATE POLICY "Users can view own training progress" ON training_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own training progress" ON training_progress;
CREATE POLICY "Users can update own training progress" ON training_progress FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all training progress" ON training_progress;
CREATE POLICY "Admins can view all training progress" ON training_progress FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can view own documents" ON onboarding_documents;
CREATE POLICY "Users can view own documents" ON onboarding_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upload own documents" ON onboarding_documents;
CREATE POLICY "Users can upload own documents" ON onboarding_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all documents" ON onboarding_documents;
CREATE POLICY "Admins can manage all documents" ON onboarding_documents FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can view own metrics" ON onboarding_metrics;
CREATE POLICY "Users can view own metrics" ON onboarding_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all metrics" ON onboarding_metrics;
CREATE POLICY "Admins can manage all metrics" ON onboarding_metrics FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can view own notifications" ON onboarding_notifications;
CREATE POLICY "Users can view own notifications" ON onboarding_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON onboarding_notifications;
CREATE POLICY "Users can update own notifications" ON onboarding_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON onboarding_notifications;
CREATE POLICY "Admins can manage all notifications" ON onboarding_notifications FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can view own assignments" ON first_assignments;
CREATE POLICY "Users can view own assignments" ON first_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own assignments" ON first_assignments;
CREATE POLICY "Users can update own assignments" ON first_assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all assignments" ON first_assignments;
CREATE POLICY "Admins can manage all assignments" ON first_assignments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Insert default training modules
INSERT INTO training_modules (title, description, content, duration_minutes, user_type, module_order, is_mandatory) VALUES
('Introduction to Stokika', 'Learn about Stokika platform, mission, and values', 'Welcome to Stokika! This module covers our company mission, values, and how we operate in the market.', 30, 'field_agent', 1, true),
('Product Knowledge', 'Understanding products and inventory management', 'Learn about the products you will be selling, pricing, and inventory management.', 45, 'field_agent', 2, true),
('Vendor Relations', 'How to work with vendors effectively', 'Best practices for building relationships with vendors and managing orders.', 40, 'field_agent', 3, true),
('Mobile App Training', 'Using the Stokika mobile application', 'Complete guide to using the mobile app for orders, tracking, and reporting.', 35, 'field_agent', 4, true),
('Sales Techniques', 'Effective sales strategies and customer service', 'Learn proven sales techniques and how to provide excellent customer service.', 50, 'field_agent', 5, true),
('Compliance & Ethics', 'Understanding company policies and ethical practices', 'Important policies, compliance requirements, and ethical business practices.', 25, 'field_agent', 6, true)
ON CONFLICT DO NOTHING;

-- Function to initialize onboarding
CREATE OR REPLACE FUNCTION initialize_onboarding(p_user_id UUID, p_user_type VARCHAR)
RETURNS VOID AS $$
BEGIN
    INSERT INTO onboarding_steps (user_id, user_type, step_name, step_order, status) VALUES
    (p_user_id, p_user_type, 'account_created', 1, 'completed'),
    (p_user_id, p_user_type, 'email_verification', 2, 'pending'),
    (p_user_id, p_user_type, 'profile_setup', 3, 'pending'),
    (p_user_id, p_user_type, 'document_upload', 4, 'pending'),
    (p_user_id, p_user_type, 'training_completion', 5, 'pending'),
    (p_user_id, p_user_type, 'first_assignment', 6, 'pending')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO training_progress (user_id, module_id, status)
    SELECT p_user_id, id, 'not_started'
    FROM training_modules
    WHERE user_type = p_user_type AND is_mandatory = true
    ON CONFLICT DO NOTHING;
    
    INSERT INTO onboarding_notifications (user_id, notification_type, title, message)
    VALUES (p_user_id, 'welcome', 'Welcome to Stokika!', 'Complete your onboarding steps to get started.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_steps INTEGER;
    v_completed_steps INTEGER;
    v_progress_percentage INTEGER;
    v_result JSON;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_steps, v_completed_steps
    FROM onboarding_steps
    WHERE user_id = p_user_id;
    
    v_progress_percentage := CASE WHEN v_total_steps > 0 
        THEN (v_completed_steps * 100 / v_total_steps) 
        ELSE 0 
    END;
    
    v_result := json_build_object(
        'total_steps', v_total_steps,
        'completed_steps', v_completed_steps,
        'progress_percentage', v_progress_percentage
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for training completion
CREATE OR REPLACE FUNCTION check_training_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_total_modules INTEGER;
    v_completed_modules INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total_modules, v_completed_modules
    FROM training_progress
    WHERE user_id = NEW.user_id;
    
    IF v_completed_modules = v_total_modules THEN
        UPDATE onboarding_steps
        SET status = 'completed', completed_at = NOW()
        WHERE user_id = NEW.user_id AND step_name = 'training_completion';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS training_completion_trigger ON training_progress;
CREATE TRIGGER training_completion_trigger
AFTER UPDATE ON training_progress
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION check_training_completion();

SELECT 'Onboarding tables created successfully' as status;
