-- SAM&ZO migration: first safe single-task reopen action.
-- This only reopens one completed task for the same profile that completed it.
-- It does not add full list reset, recurring reset, reporting, editing,
-- deleting, or admin override behavior.

drop policy if exists taken_update_open_door_eigen_afgeronde_uitvoerder on public.taken;
create policy taken_update_open_door_eigen_afgeronde_uitvoerder
on public.taken
for update
to authenticated
using (
  archived_at is null
  and status = 'afgerond'
  and app_private.can_view_lijst(lijst_id)
  and exists (
    select 1
    from public.taakuitvoerders tu
    join public.profielen pr on pr.id = tu.profiel_id
    join public.personen p on p.id = pr.persoon_id
    where tu.taak_id = taken.id
      and tu.profiel_id = app_private.current_profiel_id()
      and tu.status = 'afgerond'
      and tu.afgerond_at is not null
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
)
with check (
  archived_at is null
  and status = 'open'
  and afgerond_at is null
  and updated_at is not null
  and updated_by_persoon_id = app_private.current_persoon_id()
  and app_private.can_view_lijst(lijst_id)
);

drop policy if exists taakuitvoerders_update_eigen_claim_of_vrijgeven on public.taakuitvoerders;
create policy taakuitvoerders_update_eigen_claim_of_vrijgeven
on public.taakuitvoerders
for update
to authenticated
using (
  profiel_id = app_private.current_profiel_id()
  and status in ('actief', 'afgerond', 'vervallen')
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
    or
    (
      status = 'afgerond'
      and geclaimd_door_persoon_id = app_private.current_persoon_id()
      and geclaimd_at is not null
      and afgerond_at is not null
      and exists (
        select 1
        from public.taken t
        where t.id = taakuitvoerders.taak_id
          and t.archived_at is null
          and t.status = 'afgerond'
          and app_private.can_view_lijst(t.lijst_id)
      )
    )
  )
);

create or replace function public.taak_heropenen(
  target_taak_id uuid,
  target_taakuitvoerder_id uuid,
  target_profiel_id uuid
)
returns table (
  taak_heropend boolean,
  taakuitvoerder_heropend boolean
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_current_profiel_id uuid := app_private.current_profiel_id();
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_updated_taak_id uuid;
  v_updated_taakuitvoerder_id uuid;
begin
  if target_taak_id is null
    or target_taakuitvoerder_id is null
    or target_profiel_id is null
  then
    raise exception 'Taak, taakuitvoerder en profiel zijn verplicht.';
  end if;

  if v_current_profiel_id is null or v_current_persoon_id is null then
    raise exception 'Taak heropenen kan alleen met een gekoppeld actief profiel.';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Taak heropenen kan alleen voor het eigen actieve profiel.';
  end if;

  update public.taken t
  set
    status = 'open',
    afgerond_at = null,
    updated_at = v_now,
    updated_by_persoon_id = v_current_persoon_id
  where t.id = target_taak_id
    and t.archived_at is null
    and t.status = 'afgerond'
    and exists (
      select 1
      from public.taakuitvoerders tu
      where tu.id = target_taakuitvoerder_id
        and tu.taak_id = t.id
        and tu.profiel_id = v_current_profiel_id
        and tu.status = 'afgerond'
        and tu.afgerond_at is not null
    )
  returning t.id into v_updated_taak_id;

  if v_updated_taak_id is null then
    raise exception 'Taak heropenen is niet gelukt voor deze taak.';
  end if;

  update public.taakuitvoerders tu
  set
    status = 'actief',
    afgerond_at = null,
    updated_at = v_now
  where tu.id = target_taakuitvoerder_id
    and tu.taak_id = target_taak_id
    and tu.profiel_id = v_current_profiel_id
    and tu.status = 'afgerond'
  returning tu.id into v_updated_taakuitvoerder_id;

  if v_updated_taakuitvoerder_id is null then
    raise exception 'Taakuitvoerder heropenen is niet gelukt voor deze taak.';
  end if;

  taak_heropend := true;
  taakuitvoerder_heropend := true;
  return next;
end;
$$;

revoke all on function public.taak_heropenen(uuid, uuid, uuid) from public;
grant execute on function public.taak_heropenen(uuid, uuid, uuid) to authenticated;
