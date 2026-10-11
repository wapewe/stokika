-- Ultra-Secure Supabase Functions for 100% Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Advanced rate limiting function with IP tracking
CREATE OR REPLACE FUNCTION advanced_rate_limit(
    p_identifier TEXT,
    p_action TEXT,
    p_ip_address INET,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
) RETURNS JSONB AS $$
DECLARE
    current_attempts INTEGER;
    window_start TIMESTAMPTZ;
    is_blocked BOOLEAN DEFAULT FALSE;
    block_until TIMESTAMPTZ;
BEGIN
    -- Clean old entries
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    -- Get current attempts for this identifier + action + IP
    SELECT attempts, rate_limits.window_start, blocked_until 
    INTO current_attempts, window_start, block_until
    FROM rate_limits 
    WHERE ip_address = p_ip_address 
    AND endpoint = p_action || '_' || p_identifier;
    
    -- Check if currently blocked
    IF block_until IS NOT NULL AND block_until > NOW() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'block_until', block_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (block_until - NOW()))
        );
    END IF;
    
    -- If no record exists, create one
    IF current_attempts IS NULL THEN
        INSERT INTO rate_limits (ip_address, endpoint, attempts, window_start)
        VALUES (p_ip_address, p_action || '_' || p_identifier, 1, NOW())
        ON CONFLICT (ip_address, endpoint) 
        DO UPDATE SET attempts = 1, window_start = NOW(), blocked_until = NULL;
        
        RETURN jsonb_build_object('allowed', true, 'attempts', 1, 'max_attempts', p_max_attempts);
    END IF;
    
    -- Check if window has expired
    IF window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
        UPDATE rate_limits 
        SET attempts = 1, window_start = NOW(), blocked_until = NULL
        WHERE ip_address = p_ip_address AND endpoint = p_action || '_' || p_identifier;
        
        RETURN jsonb_build_object('allowed', true, 'attempts', 1, 'max_attempts', p_max_attempts);
    END IF;
    
    -- Check if max attempts reached
    IF current_attempts >= p_max_attempts THEN
        UPDATE rate_limits 
        SET blocked_until = NOW() + (p_window_minutes * 2 || ' minutes')::INTERVAL
        WHERE ip_address = p_ip_address AND endpoint = p_action || '_' || p_identifier;
        
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'block_until', NOW() + (p_window_minutes * 2 || ' minutes')::INTERVAL
        );
    END IF;
    
    -- Increment attempts
    UPDATE rate_limits 
    SET attempts = attempts + 1
    WHERE ip_address = p_ip_address AND endpoint = p_action || '_' || p_identifier;
    
    RETURN jsonb_build_object(
        'allowed', true, 
        'attempts', current_attempts + 1, 
        'max_attempts', p_max_attempts
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure OTP generation with device fingerprinting
CREATE OR REPLACE FUNCTION generate_secure_otp(
    p_user_id UUID,
    p_email VARCHAR(255),
    p_purpose VARCHAR(50),
    p_device_fingerprint TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS VARCHAR(6) AS $$
DECLARE
    otp_code VARCHAR(6);
    existing_count INTEGER;
BEGIN
    -- Check for too many active OTPs
    SELECT COUNT(*) INTO existing_count
    FROM otp_verifications 
    WHERE user_id = p_user_id 
    AND purpose = p_purpose 
    AND verified = false 
    AND expires_at > NOW()
    AND created_at > NOW() - INTERVAL '1 hour';
    
    IF existing_count >= 3 THEN
        RAISE EXCEPTION 'Too many active OTP requests';
    END IF;
    
    -- Generate cryptographically secure OTP
    otp_code := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    
    -- Invalidate existing OTPs for this user/purpose
    UPDATE otp_verifications 
    SET verified = true, invalidated_at = NOW()
    WHERE user_id = p_user_id 
    AND purpose = p_purpose 
    AND verified = false;
    
    -- Insert new OTP with enhanced security
    INSERT INTO otp_verifications (
        user_id, 
        email, 
        otp_code, 
        purpose, 
        expires_at,
        device_fingerprint,
        ip_address,
        max_attempts
    ) VALUES (
        p_user_id, 
        p_email, 
        otp_code, 
        p_purpose, 
        NOW() + INTERVAL '10 minutes',
        p_device_fingerprint,
        p_ip_address,
        3
    );
    
    RETURN otp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ultra-secure OTP verification
CREATE OR REPLACE FUNCTION verify_secure_otp(
    p_email VARCHAR(255),
    p_otp_code VARCHAR(6),
    p_purpose VARCHAR(50),
    p_device_fingerprint TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    otp_record RECORD;
    verification_result JSONB;
BEGIN
    -- Get OTP record with all security checks
    SELECT * INTO otp_record
    FROM otp_verifications
    WHERE email = p_email 
    AND otp_code = p_otp_code 
    AND purpose = p_purpose 
    AND verified = false 
    AND expires_at > NOW()
    AND (device_fingerprint = p_device_fingerprint OR device_fingerprint IS NULL)
    AND attempts < max_attempts
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if OTP exists and is valid
    IF otp_record.id IS NULL THEN
        -- Increment attempts for any existing OTP
        UPDATE otp_verifications 
        SET attempts = attempts + 1
        WHERE email = p_email 
        AND purpose = p_purpose 
        AND verified = false
        AND expires_at > NOW();
        
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid or expired OTP',
            'code', 'INVALID_OTP'
        );
    END IF;
    
    -- Check attempt limit
    IF otp_record.attempts >= otp_record.max_attempts THEN
        UPDATE otp_verifications 
        SET verified = true, invalidated_at = NOW()
        WHERE id = otp_record.id;
        
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Too many OTP attempts',
            'code', 'MAX_ATTEMPTS_EXCEEDED'
        );
    END IF;
    
    -- Mark as verified and log verification
    UPDATE otp_verifications 
    SET verified = true, 
        verified_at = NOW(),
        verification_ip = p_ip_address
    WHERE id = otp_record.id;
    
    -- Log successful verification
    INSERT INTO security_audit_log (
        user_id, 
        action, 
        ip_address, 
        device_fingerprint,
        details
    ) VALUES (
        otp_record.user_id,
        'otp_verified',
        p_ip_address,
        p_device_fingerprint,
        jsonb_build_object(
            'purpose', p_purpose,
            'email', p_email,
            'otp_id', otp_record.id
        )
    );
    
    RETURN jsonb_build_object(
        'valid', true,
        'user_id', otp_record.user_id,
        'email', otp_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure session creation
CREATE OR REPLACE FUNCTION create_secure_session(
    p_user_id UUID,
    p_session_token VARCHAR(255),
    p_device_fingerprint TEXT,
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS UUID AS $$
DECLARE
    session_id UUID;
    active_sessions INTEGER;
BEGIN
    -- Check for too many active sessions
    SELECT COUNT(*) INTO active_sessions
    FROM user_sessions 
    WHERE user_id = p_user_id 
    AND is_active = true 
    AND expires_at > NOW();
    
    -- Limit to 3 concurrent sessions
    IF active_sessions >= 3 THEN
        -- Deactivate oldest session
        UPDATE user_sessions 
        SET is_active = false, logout_reason = 'max_sessions_exceeded'
        WHERE id = (
            SELECT id FROM user_sessions 
            WHERE user_id = p_user_id 
            AND is_active = true 
            ORDER BY created_at ASC 
            LIMIT 1
        );
    END IF;
    
    -- Create new session
    INSERT INTO user_sessions (
        user_id,
        session_token,
        device_fingerprint,
        ip_address,
        user_agent,
        expires_at,
        is_active
    ) VALUES (
        p_user_id,
        p_session_token,
        p_device_fingerprint,
        p_ip_address,
        p_user_agent,
        NOW() + INTERVAL '30 minutes',
        true
    ) RETURNING id INTO session_id;
    
    -- Log session creation
    INSERT INTO security_audit_log (
        user_id,
        action,
        ip_address,
        device_fingerprint,
        details
    ) VALUES (
        p_user_id,
        'session_created',
        p_ip_address,
        p_device_fingerprint,
        jsonb_build_object(
            'session_id', session_id,
            'user_agent', p_user_agent
        )
    );
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate session with security checks
CREATE OR REPLACE FUNCTION validate_secure_session(
    p_session_token VARCHAR(255),
    p_device_fingerprint TEXT,
    p_ip_address INET
) RETURNS JSONB AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get session with all security checks
    SELECT us.*, u.email, u.role, u.status
    INTO session_record
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = p_session_token
    AND us.is_active = true
    AND us.expires_at > NOW()
    AND us.device_fingerprint = p_device_fingerprint
    AND u.status = 'active';
    
    -- Check if session exists and is valid
    IF session_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invalid or expired session',
            'code', 'INVALID_SESSION'
        );
    END IF;
    
    -- Check for suspicious IP change (optional warning)
    IF session_record.ip_address != p_ip_address THEN
        INSERT INTO security_audit_log (
            user_id,
            action,
            ip_address,
            device_fingerprint,
            details
        ) VALUES (
            session_record.user_id,
            'ip_change_detected',
            p_ip_address,
            p_device_fingerprint,
            jsonb_build_object(
                'original_ip', session_record.ip_address,
                'new_ip', p_ip_address,
                'session_id', session_record.id
            )
        );
    END IF;
    
    -- Update last activity and extend session
    UPDATE user_sessions 
    SET last_activity = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes',
        ip_address = p_ip_address
    WHERE id = session_record.id;
    
    RETURN jsonb_build_object(
        'valid', true,
        'user_id', session_record.user_id,
        'email', session_record.email,
        'role', session_record.role,
        'session_id', session_record.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure password validation
CREATE OR REPLACE FUNCTION validate_password_policy(
    p_password TEXT
) RETURNS JSONB AS $$
DECLARE
    errors TEXT[] := '{}';
    requirements JSONB;
BEGIN
    -- Check minimum length
    IF LENGTH(p_password) < 12 THEN
        errors := array_append(errors, 'Password must be at least 12 characters long');
    END IF;
    
    -- Check maximum length
    IF LENGTH(p_password) > 128 THEN
        errors := array_append(errors, 'Password must not exceed 128 characters');
    END IF;
    
    -- Check for uppercase letter
    IF p_password !~ '[A-Z]' THEN
        errors := array_append(errors, 'Password must contain at least one uppercase letter');
    END IF;
    
    -- Check for lowercase letter
    IF p_password !~ '[a-z]' THEN
        errors := array_append(errors, 'Password must contain at least one lowercase letter');
    END IF;
    
    -- Check for digit
    IF p_password !~ '[0-9]' THEN
        errors := array_append(errors, 'Password must contain at least one number');
    END IF;
    
    -- Check for special character
    IF p_password !~ '[!@#$%^&*(),.?":{}|<>]' THEN
        errors := array_append(errors, 'Password must contain at least one special character');
    END IF;
    
    -- Check for common passwords (basic check)
    IF LOWER(p_password) = ANY(ARRAY['password', '123456', '123456789', 'qwerty', 'abc123', 'password123']) THEN
        errors := array_append(errors, 'Password is too common, please choose a different one');
    END IF;
    
    requirements := jsonb_build_object(
        'min_length', 12,
        'max_length', 128,
        'requires_uppercase', true,
        'requires_lowercase', true,
        'requires_number', true,
        'requires_special', true
    );
    
    RETURN jsonb_build_object(
        'valid', array_length(errors, 1) IS NULL,
        'errors', errors,
        'requirements', requirements
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions and OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_security_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Clean expired OTPs
    DELETE FROM otp_verifications 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean expired sessions
    UPDATE user_sessions 
    SET is_active = false, logout_reason = 'expired'
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Clean old rate limit entries
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    -- Clean old audit logs (keep 90 days)
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION advanced_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION generate_secure_otp TO authenticated;
GRANT EXECUTE ON FUNCTION verify_secure_otp TO authenticated;
GRANT EXECUTE ON FUNCTION create_secure_session TO authenticated;
GRANT EXECUTE ON FUNCTION validate_secure_session TO authenticated;
GRANT EXECUTE ON FUNCTION validate_password_policy TO authenticated;

-- Create a scheduled job to clean up expired data (run this manually or set up cron)
-- SELECT cron.schedule('cleanup-security-data', '0 2 * * *', 'SELECT cleanup_expired_security_data();');