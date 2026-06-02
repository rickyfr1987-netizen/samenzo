-- SAM&ZO migration: transactional moment unregister with own claim release.
-- This public RPC is SECURITY INVOKER: it does not bypass table RLS and does
-- not use service-role behavior. It runs the normal authenticated policies in
-- one transaction so related own claims are released before the deelname is
-- set to afgemeld.

create or replace function public.afmelden_moment_met_claims(
  target_moment_id uuid,
  target_deelname_id uuid,
  target_profiel_id uuid
)
returns table (
  deelname_released boolean,
  role_claims_released integer,
  task_claims_released integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_current_profiel_id uuid := app_private.current_profiel_id();
  v_current_persoon_id uuid := app_private.current_persoon_id();
  v_updated_deelname_id uuid;
begin
  if target_moment_id is null
    or target_deelname_id is null
    or target_profiel_id is null
  then
    raise exception 'Moment, deelname en profiel zijn verplicht.';
  end if;

  if v_current_profiel_id is null or v_current_persoon_id is null then
    raise exception 'Afmelden kan alleen met een gekoppeld actief profiel.';
  end if;

  if target_profiel_id <> v_current_profiel_id then
    raise exception 'Afmelden kan alleen voor het eigen actieve profiel.';
  end if;

  update public.rolbezettingen rb
  set
    status = 'afgemeld',
    afgemeld_at = v_now,
    updated_at = v_now
  where rb.profiel_id = v_current_profiel_id
    and rb.status = 'actief'
    and exists (
      select 1
      from public.momentrollen mr
      where mr.id = rb.momentrol_id
        and mr.moment_id = target_moment_id
    );

  get diagnostics role_claims_released = row_count;

  update public.taakuitvoerders tu
  set
    status = 'vervallen',
    geclaimd_door_persoon_id = null,
    geclaimd_at = null,
    afgerond_at = null,
    updated_at = v_now
  where tu.profiel_id = v_current_profiel_id
    and tu.status = 'actief'
    and exists (
      select 1
      from public.taken t
      join public.lijsten l on l.id = t.lijst_id
      where t.id = tu.taak_id
        and t.archived_at is null
        and t.status in ('open', 'geaccepteerd', 'bezig')
        and l.archived_at is null
        and l.gekoppeld_moment_id = target_moment_id
    );

  get diagnostics task_claims_released = row_count;

  update public.deelnames d
  set
    status = 'afgemeld',
    afgemeld_at = v_now,
    status_updated_at = v_now,
    updated_at = v_now
  where d.id = target_deelname_id
    and d.moment_id = target_moment_id
    and d.profiel_id = v_current_profiel_id
    and d.archived_at is null
    and d.status in ('geaccepteerd', 'ingeschreven')
  returning d.id into v_updated_deelname_id;

  if v_updated_deelname_id is null then
    raise exception 'Afmelden is niet gelukt voor deze deelname.';
  end if;

  deelname_released := true;
  return next;
end;
$$;

revoke all on function public.afmelden_moment_met_claims(uuid, uuid, uuid) from public;
grant execute on function public.afmelden_moment_met_claims(uuid, uuid, uuid) to authenticated;
