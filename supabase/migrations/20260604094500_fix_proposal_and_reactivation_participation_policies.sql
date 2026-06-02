-- SAM&ZO migration: adjust participation activation, rejection and visibility flow.
-- Scope: minimal proposal-related status updates for own profile without service-role.

-- Allow own profile to re-activate from non-active proposal-related statuses.
-- This keeps updates own-row scoped and does not grant cross-profile control.

revoke update on public.deelnames from anon, authenticated;
grant update (
  status,
  afgemeld_at,
  geweigerd_at,
  geaccepteerd_at,
  status_updated_at,
  updated_at,
  aangemeld_door_persoon_id,
  aangemeld_vanuit_profiel_id
) on public.deelnames to authenticated;

drop policy if exists deelnames_update_eigen_heraanmelden on public.deelnames;
create policy deelnames_update_eigen_heraanmelden
on public.deelnames
for update
to authenticated
using (
  archived_at is null
  and profiel_id = app_private.current_profiel_id()
  and status in (
    'afgemeld',
    'voorgesteld',
    'uitgenodigd',
    'wachtlijst',
    'geweigerd',
    'geannuleerd',
    'verlopen'
  )
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
  and status in (
    'afgemeld',
    'voorgesteld',
    'uitgenodigd',
    'wachtlijst',
    'geweigerd',
    'geannuleerd',
    'verlopen',
    'geaccepteerd',
    'ingeschreven'
  )
  and status_updated_at is not null
  and (
    status <> 'geaccepteerd' or geaccepteerd_at is not null
  )
  and (
    status <> 'geweigerd' or geweigerd_at is not null
  )
  and (
    status <> 'afgemeld' or afgemeld_at is not null
  )
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

-- Keep existing afmelding behaviour in place, but ensure explicit policy name stays stable.
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

-- Allow moment visibility for own own profile rows in non-active statuses from proposal flow.
create or replace function app_private.can_view_moment(target_moment_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.momenten m
    where m.id = target_moment_id
      and m.status <> 'gearchiveerd'
      and (
        app_private.is_systeembeheerder()
        or m.eigenaar_profiel_id = app_private.current_profiel_id()
        or (
          m.eigenaar_profiel_id is not null
          and app_private.has_profieltoegang(m.eigenaar_profiel_id)
        )
        or (
          m.eigenaar_groep_id is not null
          and app_private.current_profiel_is_lid_van_groep(m.eigenaar_groep_id)
        )
        or exists (
          select 1
          from public.moment_groepen mg
          where mg.moment_id = m.id
            and app_private.current_profiel_is_lid_van_groep(mg.groep_id)
        )
        or exists (
          select 1
          from public.deelnames d
          where d.moment_id = m.id
            and d.profiel_id = app_private.current_profiel_id()
            and d.status in (
              'voorgesteld',
              'uitgenodigd',
              'geaccepteerd',
              'ingeschreven',
              'wachtlijst',
              'afgemeld',
              'geweigerd'
            )
        )
        or exists (
          select 1
          from public.momentrollen mr
          join public.rolbezettingen rb on rb.momentrol_id = mr.id
          where mr.moment_id = m.id
            and rb.profiel_id = app_private.current_profiel_id()
            and rb.status = 'actief'
        )
      )
  );
end;
$$;

revoke all on function app_private.can_view_moment(uuid) from public;
grant execute on function app_private.can_view_moment(uuid) to authenticated;

