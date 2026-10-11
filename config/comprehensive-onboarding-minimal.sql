-- Minimal Onboarding Schema - Only creates what's missing
-- Tables that already exist: onboarding_steps, onboarding_tokens, onboarding_templates

-- Training Modules Table
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Progress Table
CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    quiz_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, module_id)
);

-- Document Uploads Table
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    verification_status VARCHAR(20) DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS onboarding_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    metric_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Notifications Table
CREATE TABLE IF NOT EXISTS onboarding_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- First Assignment Tracking Table
CREATE TABLE IF NOT EXISTS first_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL,
    assignment_description TEXT,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'assigned',
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_progress_user ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_user ON onboarding_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_metrics_user ON onboarding_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_notifications_user ON onboarding_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_first_assignments_user ON first_assignments(user_id);

-- Enable RLS
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_assignments ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (Admin full access)
DROP POLICY IF EXISTS "Admin access training_modules" ON training_modules;
CREATE POLICY "Admin access training_modules" ON training_modules FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access training_progress" ON training_progress;
CREATE POLICY "Admin access training_progress" ON training_progress FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access onboarding_documents" ON onboarding_documents;
CREATE POLICY "Admin access onboarding_documents" ON onboarding_documents FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access onboarding_metrics" ON onboarding_metrics;
CREATE POLICY "Admin access onboarding_metrics" ON onboarding_metrics FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access onboarding_notifications" ON onboarding_notifications;
CREATE POLICY "Admin access onboarding_notifications" ON onboarding_notifications FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Admin access first_assignments" ON first_assignments;
CREATE POLICY "Admin access first_assignments" ON first_assignments FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- User access policies
DROP POLICY IF EXISTS "Users own training_progress" ON training_progress;
CREATE POLICY "Users own training_progress" ON training_progress FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own documents" ON onboarding_documents;
CREATE POLICY "Users own documents" ON onboarding_documents FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own metrics" ON onboarding_metrics;
CREATE POLICY "Users own metrics" ON onboarding_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own notifications" ON onboarding_notifications;
CREATE POLICY "Users own notifications" ON onboarding_notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own assignments" ON first_assignments;
CREATE POLICY "Users own assignments" ON first_assignments FOR ALL TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public view training_modules" ON training_modules;
CREATE POLICY "Public view training_modules" ON training_modules FOR SELECT USING (true);

-- Insert default training modules
INSERT INTO training_modules (title, description, content, duration_minutes, user_type, module_order, is_mandatory) VALUES
('Introduction to Stokika', 'Learn about Stokika platform', 'Welcome to Stokika!', 30, 'field_agent', 1, true),
('Product Knowledge', 'Understanding products', 'Learn about products.', 45, 'field_agent', 2, true),
('Vendor Relations', 'Work with vendors', 'Best practices.', 40, 'field_agent', 3, true),
('Mobile App Training', 'Using the app', 'Complete guide.', 35, 'field_agent', 4, true),
('Sales Techniques', 'Sales strategies', 'Learn techniques.', 50, 'field_agent', 5, true),
('Compliance & Ethics', 'Company policies', 'Important policies.', 25, 'field_agent', 6, true)
ON CONFLICT DO NOTHING;

SELECT 'Onboarding tables created successfully' as status;
