-- SAM&ZO migration: fix taakuitvoerders RLS recursion.
-- Keep task execution RLS narrow without querying taakuitvoerders from a
-- taakuitvoerders policy expression.

create or replace function app_private.can_view_lijst(target_lijst_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.lijsten l
    where l.id = target_lijst_id
      and l.archived_at is null
      and l.status <> 'gearchiveerd'
      and (
        app_private.is_systeembeheerder()
        or l.eigenaar_profiel_id = app_private.current_profiel_id()
        or (
          l.eigenaar_profiel_id is not null
          and app_private.has_profieltoegang(l.eigenaar_profiel_id)
        )
        or (
          l.eigenaar_groep_id is not null
          and app_private.current_profiel_is_lid_van_groep(l.eigenaar_groep_id)
        )
        or (
          l.gekoppeld_moment_id is not null
          and app_private.can_view_moment(l.gekoppeld_moment_id)
        )
        or exists (
          select 1
          from public.lijst_groepen lg
          where lg.lijst_id = l.id
            and app_private.current_profiel_is_lid_van_groep(lg.groep_id)
        )
      )
  );
$$;

revoke all on function app_private.can_view_lijst(uuid) from public;
grant execute on function app_private.can_view_lijst(uuid) to authenticated;

create or replace function app_private.taak_heeft_actieve_uitvoerder(
  target_taak_id uuid,
  excluded_taakuitvoerder_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.taakuitvoerders tu
    where tu.taak_id = target_taak_id
      and tu.status = 'actief'
      and (
        excluded_taakuitvoerder_id is null
        or tu.id <> excluded_taakuitvoerder_id
      )
  );
$$;

revoke all on function app_private.taak_heeft_actieve_uitvoerder(uuid, uuid) from public;
grant execute on function app_private.taak_heeft_actieve_uitvoerder(uuid, uuid) to authenticated;

drop policy if exists taakuitvoerders_select_zichtbare_taak on public.taakuitvoerders;
create policy taakuitvoerders_select_zichtbare_taak
on public.taakuitvoerders
for select
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  or app_private.has_profieltoegang(profiel_id)
  or app_private.is_systeembeheerder()
  or exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and app_private.can_view_lijst(t.lijst_id)
  )
);

drop policy if exists taakuitvoerders_insert_eigen_claim on public.taakuitvoerders;
create policy taakuitvoerders_insert_eigen_claim
on public.taakuitvoerders
for insert
to authenticated
with check (
  profiel_id = app_private.current_profiel_id()
  and status = 'actief'
  and geclaimd_door_persoon_id = app_private.current_persoon_id()
  and geclaimd_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and t.status in ('open', 'geaccepteerd', 'bezig')
      and app_private.can_view_lijst(t.lijst_id)
  )
  and not app_private.taak_heeft_actieve_uitvoerder(taakuitvoerders.taak_id, null)
);

drop policy if exists taakuitvoerders_update_eigen_claim_of_vrijgeven on public.taakuitvoerders;
create policy taakuitvoerders_update_eigen_claim_of_vrijgeven
on public.taakuitvoerders
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and status in ('actief', 'vervallen')
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.taken t
    where t.id = taakuitvoerders.taak_id
      and t.archived_at is null
      and app_private.can_view_lijst(t.lijst_id)
  )
)
with check (
  profiel_id = app_private.current_profiel_id()
  and updated_at is not null
  and exists (
    select 1
    from public.profielen pr
    join public.personen p on p.id = pr.persoon_id
    where pr.id = taakuitvoerders.profiel_id
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
  and (
    (
      status = 'actief'
      and geclaimd_door_persoon_id = app_private.current_persoon_id()
      and geclaimd_at is not null
      and afgerond_at is null
      and exists (
        select 1
        from public.taken t
        where t.id = taakuitvoerders.taak_id
          and t.archived_at is null
          and t.status in ('open', 'geaccepteerd', 'bezig')
          and app_private.can_view_lijst(t.lijst_id)
      )
      and not app_private.taak_heeft_actieve_uitvoerder(
        taakuitvoerders.taak_id,
        taakuitvoerders.id
      )
    )
    or
    (
      status = 'vervallen'
      and geclaimd_door_persoon_id is null
      and geclaimd_at is null
      and afgerond_at is null
      and exists (
        select 1
        from public.taken t
        where t.id = taakuitvoerders.taak_id
          and t.archived_at is null
          and app_private.can_view_lijst(t.lijst_id)
      )
    )
  )
);
