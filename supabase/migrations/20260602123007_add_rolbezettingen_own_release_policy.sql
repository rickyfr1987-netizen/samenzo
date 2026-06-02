-- SAM&ZO migration: allow a current profile to release their own active role occupancy.
-- This intentionally does not add admin override behavior, approval workflow,
-- escalation logic, or role reassignment.

revoke update on public.rolbezettingen from anon, authenticated;
grant update (
  status,
  afgemeld_at,
  updated_at
) on public.rolbezettingen to authenticated;

drop policy if exists rolbezettingen_update_eigen_vrijgeven on public.rolbezettingen;
create policy rolbezettingen_update_eigen_vrijgeven
on public.rolbezettingen
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = rolbezettingen.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
)
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'afgemeld'
  and afgemeld_at is not null
  and updated_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = rolbezettingen.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
);
