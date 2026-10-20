-- The gateway is SECURITY INVOKER; grant only the identity columns it needs.
grant select(id,email,email_confirmed_at,is_anonymous) on auth.users to service_role;
