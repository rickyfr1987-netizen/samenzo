-- SAM&ZO migration: first read-only RLS layer for doelen.
-- Doelen geven richting. Dit is niet bedoeld voor activering/afhandeling.
-- Deze policylaag is bewust leesgericht en laat alleen zichtbaarheid door
-- profiel/groep-context en bestaand beheer toe.

create or replace function app_private.can_view_doel(target_doel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.doelen d
    where d.id = target_doel_id
      and d.archived_at is null
      and d.status <> 'gearchiveerd'
      and (
        app_private.is_systeembeheerder()
        or d.eigenaar_profiel_id = app_private.current_profiel_id()
        or (
          d.eigenaar_profiel_id is not null
          and app_private.has_profieltoegang(d.eigenaar_profiel_id)
        )
        or (
          d.eigenaar_groep_id is not null
          and app_private.current_profiel_is_lid_van_groep(d.eigenaar_groep_id)
        )
      )
  );
$$;

revoke all on function app_private.can_view_doel(uuid) from public;
grant execute on function app_private.can_view_doel(uuid) to authenticated;

drop policy if exists doelen_select_can_view_doel on public.doelen;
create policy doelen_select_can_view_doel
on public.doelen
for select
to authenticated
using (
  app_private.can_view_doel(id)
);

drop policy if exists doel_koppelingen_select_can_view_doel on public.doel_koppelingen;
create policy doel_koppelingen_select_can_view_doel
on public.doel_koppelingen
for select
to authenticated
using (
  app_private.can_view_doel(doel_id)
);
