-- Distinguish table aliases from the gateway's local composite variables.
do $migration$
declare source text; fixed text;
begin
  select pg_get_functiondef('public.store_api(text,jsonb,uuid)'::regprocedure) into source;
  fixed=replace(source,
    'select r.id,r.code_id as "codeId",c.label,r.primary_id as "primaryId",r.secondary_id as "secondaryId",r.scores,r.created_at as "createdAt" from store_private.results r join store_private.codes c on c.id=r.code_id where coalesce(p->>''codeId'','''')='''' or r.code_id::text=p->>''codeId'' order by r.created_at desc',
    'select rr.id,rr.code_id as "codeId",cc.label,rr.primary_id as "primaryId",rr.secondary_id as "secondaryId",rr.scores,rr.created_at as "createdAt" from store_private.results rr join store_private.codes cc on cc.id=rr.code_id where coalesce(p->>''codeId'','''')='''' or rr.code_id::text=p->>''codeId'' order by rr.created_at desc');
  if fixed=source then raise exception 'Expected gateway query was not found'; end if;
  execute fixed;
end;
$migration$;
