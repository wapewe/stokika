-- Grant insert privileges to anon on audit_logs
GRANT INSERT ON public.audit_logs TO anon;
GRANT INSERT ON public.audit_logs TO authenticated;
