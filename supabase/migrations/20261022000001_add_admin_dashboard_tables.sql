-- ===============================================
-- Supplemental Admin Dashboard Tables
-- Adds missing tables for rembrandts admin dashboard
-- ===============================================

-- ===============================================
-- SMS LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'scheduled')),
    provider TEXT DEFAULT 'africas_talking',
    cost DECIMAL(10, 2) DEFAULT 2.00,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs(recipient_phone);

-- RLS Policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all SMS logs" ON public.sms_logs
    FOR SELECT TO authenticated
    USING (has_role(ARRAY['admin', 'super_admin', 'operations']));

CREATE POLICY "Admin can insert SMS logs" ON public.sms_logs
    FOR INSERT TO authenticated
    WITH CHECK (has_role(ARRAY['admin', 'super_admin', 'operations']));

-- ===============================================
-- SMS TEMPLATES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    template_text TEXT NOT NULL,
    variables TEXT[], -- Array of variable names like {{name}}, {{order_id}}
    category TEXT, -- e.g., 'order_confirmation', 'delivery_update', 'marketing'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage SMS templates" ON public.sms_templates
    FOR ALL TO authenticated
    USING (has_role(ARRAY['admin', 'super_admin', 'operations']));

-- ===============================================
-- CONVERSATIONS TABLE (In-App Messaging)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count_p1 INTEGER DEFAULT 0,
    unread_count_p2 INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(participant1_id, participant2_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT TO authenticated
    USING (
        auth.uid() = participant1_id OR auth.uid() = participant2_id OR
        has_role(ARRAY['admin', 'super_admin', 'operations'])
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ===============================================
-- MESSAGES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- ===============================================
-- GEOFENCES TABLE (GPS Tracking)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    geofence_type TEXT CHECK (geofence_type IN ('territory', 'vendor', 'warehouse', 'restricted')),
    assigned_agent_id UUID REFERENCES public.field_agents(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_geofences_agent ON public.geofences(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_geofences_type ON public.geofences(geofence_type);

-- RLS Policies
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage geofences" ON public.geofences
    FOR ALL TO authenticated
    USING (has_role(ARRAY['admin', 'super_admin', 'operations']));

CREATE POLICY "Agents can view their geofences" ON public.geofences
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.profile_id = auth.uid() AND field_agents.id = geofences.assigned_agent_id
        )
    );

-- ===============================================
-- VENDOR VISITS TABLE (Field Agent Activity)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.vendor_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.field_agents(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    visit_type TEXT CHECK (visit_type IN ('routine', 'order_delivery', 'problem_solving', 'onboarding', 'follow_up')),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    visit_notes TEXT,
    outcome TEXT,
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_visits_agent ON public.vendor_visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_vendor ON public.vendor_visits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_visits_checkin ON public.vendor_visits(check_in_time DESC);

-- RLS Policies
ALTER TABLE public.vendor_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all visits" ON public.vendor_visits
    FOR SELECT TO authenticated
    USING (has_role(ARRAY['admin', 'super_admin', 'operations', 'supervisor']));

CREATE POLICY "Agents can view their visits" ON public.vendor_visits
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.profile_id = auth.uid() AND field_agents.id = vendor_visits.agent_id
        )
    );

CREATE POLICY "Agents can insert their visits" ON public.vendor_visits
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.field_agents
            WHERE field_agents.profile_id = auth.uid() AND field_agents.id = vendor_visits.agent_id
        )
    );

-- ===============================================
-- Insert default SMS templates
-- ===============================================
INSERT INTO public.sms_templates (name, template_text, variables, category) VALUES
    ('Order Confirmation', 'Hi {{name}}, your order #{{order_id}} has been confirmed. Total: KES {{amount}}. Track at stokika.com', ARRAY['name', 'order_id', 'amount'], 'order_confirmation'),
    ('Delivery Update', 'Your order #{{order_id}} is {{status}}. Tracking: {{tracking_code}}', ARRAY['order_id', 'status', 'tracking_code'], 'delivery_update'),
    ('Welcome Message', 'Welcome to Stokika, {{name}}! Your account is now active. Visit stokika.com to get started.', ARRAY['name'], 'welcome'),
    ('Payment Reminder', 'Reminder: Payment of KES {{amount}} for order #{{order_id}} is due. Pay via M-Pesa Paybill {{paybill}}.', ARRAY['amount', 'order_id', 'paybill'], 'payment_reminder')
ON CONFLICT (name) DO NOTHING;

-- ===============================================
-- COMMENTS
-- ===============================================
COMMENT ON TABLE public.sms_logs IS 'SMS notification history';
COMMENT ON TABLE public.sms_templates IS 'Reusable SMS message templates';
COMMENT ON TABLE public.conversations IS 'In-app messaging conversations';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.geofences IS 'GPS-based territory boundaries';
COMMENT ON TABLE public.vendor_visits IS 'Field agent visit logs';
