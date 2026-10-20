-- Configuration-only cleanup requested by the site owner. No reports, answers,
-- sessions, test codes, or usage counts are modified or deleted.
update store_private.content as c
set document = jsonb_set(
      jsonb_set(
        jsonb_set(c.document, '{profiles}', (
          select coalesce(jsonb_agg(item order by ordinal), '[]'::jsonb)
          from jsonb_array_elements(c.document->'profiles') with ordinality as entries(item, ordinal)
          where item->>'id' is distinct from 'balanced-store'
        )),
        '{revision}', to_jsonb(c.revision + 1)
      ), '{updatedAt}', to_jsonb(now())
    ),
    revision = c.revision + 1,
    updated_at = now()
where c.id = 1
  and exists (select 1 from jsonb_array_elements(c.document->'profiles') as item where item->>'id' = 'balanced-store')
returning revision, jsonb_array_length(document->'profiles') as profile_count;
