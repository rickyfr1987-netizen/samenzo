-- SAM&ZO migration: allow a current profile to afmelden their own active deelname.
-- This intentionally does not add admin override behavior and does not change
-- capacity, waitlist, deadline, proposal, or moment visibility logic.

revoke update on public.deelnames from anon, authenticated;
grant update (
  status,
  afgemeld_at,
  status_updated_at,
  updated_at
) on public.deelnames to authenticated;

drop policy if exists deelnames_update_eigen_afmelden on public.deelnames;
create policy deelnames_update_eigen_afmelden
on public.deelnames
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and status in ('geaccepteerd', 'ingeschreven')
  and app_private.can_view_moment(moment_id)
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = deelnames.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
)
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'afgemeld'
  and afgemeld_at is not null
  and status_updated_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = deelnames.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
);
