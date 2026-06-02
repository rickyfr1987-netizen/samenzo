-- SAM&ZO migration: make deelnames represent one current state per moment/profile.
-- Duplicate rows are archived instead of deleted because deelnames already has
-- archived_at soft-delete semantics.

with ranked_current_deelnames as (
  select
    id,
    row_number() over (
      partition by moment_id, profiel_id
      order by
        case
          when status in ('ingeschreven', 'geaccepteerd') then 1
          when status in ('voorgesteld', 'uitgenodigd', 'wachtlijst') then 2
          when status = 'afgemeld' then 3
          else 4
        end,
        coalesce(updated_at, status_updated_at, created_at) desc,
        created_at desc,
        id
    ) as keep_rank
  from public.deelnames
  where archived_at is null
)
update public.deelnames d
set
  archived_at = now(),
  updated_at = now()
from ranked_current_deelnames ranked
where d.id = ranked.id
  and ranked.keep_rank > 1;

create unique index if not exists deelnames_current_moment_profiel_uniek_idx
  on public.deelnames (moment_id, profiel_id)
  where archived_at is null;

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
  archived_at is null
  and profiel_id = app_private.current_profiel_id()
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
  archived_at is null
  and profiel_id = app_private.current_profiel_id()
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

drop policy if exists deelnames_update_eigen_heraanmelden on public.deelnames;
create policy deelnames_update_eigen_heraanmelden
on public.deelnames
for update
to authenticated
using (
  archived_at is null
  and profiel_id = app_private.current_profiel_id()
  and status = 'afgemeld'
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
  archived_at is null
  and profiel_id = app_private.current_profiel_id()
  and status = 'ingeschreven'
  and afgemeld_at is null
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
