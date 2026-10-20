-- The dashboard's automatic-RLS event trigger must not be a public RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
do $$
declare name text;
begin
  foreach name in array array['codes','sessions','results','content','admins','encryption','audit','rate_limits'] loop
    execute format('create policy no_client_access on store_private.%I for all to anon, authenticated using (false) with check (false)',name);
  end loop;
end;
$$;
