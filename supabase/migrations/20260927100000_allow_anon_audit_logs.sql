-- Allow anon users (unauthenticated) to insert into audit_logs during registration or pre-login activities
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

CREATE POLICY "Anyone can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);
