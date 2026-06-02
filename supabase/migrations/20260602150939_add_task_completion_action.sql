-- SAM&ZO migration: first safe task completion action.
-- Lijsten helpen uitvoeren. This allows an authenticated user to mark only
-- their own actively claimed task as completed. It does not add reopening,
-- admin override, editing, deleting, reset, or reporting behavior.

grant update (
  status,
  afgerond_at,
  updated_at,
  updated_by_persoon_id
) on public.taken to authenticated;

drop policy if exists taken_update_afgerond_door_eigen_actieve_uitvoerder on public.taken;
create policy taken_update_afgerond_door_eigen_actieve_uitvoerder
on public.taken
for update
to authenticated
using (
  archived_at is null
  and status in ('open', 'geaccepteerd', 'bezig')
  and app_private.can_view_lijst(lijst_id)
  and exists (
    select 1
    from public.taakuitvoerders tu
    join public.profielen pr on pr.id = tu.profiel_id
    join public.personen p on p.id = pr.persoon_id
    where tu.taak_id = taken.id
      and tu.profiel_id = app_private.current_profiel_id()
      and tu.status = 'actief'
      and pr.status = 'actief'
      and p.status = 'actief'
      and p.auth_user_id = auth.uid()
  )
)
with check (
  archived_at is null
  and status = 'afgerond'
  and afgerond_at is not null
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

create or replace function public.taak_afvinken(
  target_taak_id uuid,
  target_taakuitvoerder_id uuid,
  target_profiel_id uuid
)
returns table (
  taak_afgerond boolean,
  taakuitvoerder_afgerond boolean
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
    raise exception 'Taak afvinken kan alleen met een gekoppeld actief profiel.';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Taak afvinken kan alleen voor het eigen actieve profiel.';
  end if;

  update public.taken t
  set
    status = 'afgerond',
    afgerond_at = v_now,
    updated_at = v_now,
    updated_by_persoon_id = v_current_persoon_id
  where t.id = target_taak_id
    and t.archived_at is null
    and t.status in ('open', 'geaccepteerd', 'bezig')
    and exists (
      select 1
      from public.taakuitvoerders tu
      where tu.id = target_taakuitvoerder_id
        and tu.taak_id = t.id
        and tu.profiel_id = v_current_profiel_id
        and tu.status = 'actief'
    )
  returning t.id into v_updated_taak_id;

  if v_updated_taak_id is null then
    raise exception 'Taak afvinken is niet gelukt voor deze taak.';
  end if;

  update public.taakuitvoerders tu
  set
    status = 'afgerond',
    afgerond_at = v_now,
    updated_at = v_now
  where tu.id = target_taakuitvoerder_id
    and tu.taak_id = target_taak_id
    and tu.profiel_id = v_current_profiel_id
    and tu.status = 'actief'
  returning tu.id into v_updated_taakuitvoerder_id;

  if v_updated_taakuitvoerder_id is null then
    raise exception 'Taakuitvoerder afronden is niet gelukt voor deze taak.';
  end if;

  taak_afgerond := true;
  taakuitvoerder_afgerond := true;
  return next;
end;
$$;

revoke all on function public.taak_afvinken(uuid, uuid, uuid) from public;
grant execute on function public.taak_afvinken(uuid, uuid, uuid) to authenticated;
