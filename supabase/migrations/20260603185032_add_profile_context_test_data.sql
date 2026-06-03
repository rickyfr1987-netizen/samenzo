-- SAM&ZO migration: deterministic profile-context test data for profile switching scenarios.
-- Scope:
--   * seed profile-toegang rows for beheer, support and medewerker users
--   * explicit group context for visibility checks
--   * keep everything idempotent and fully scoped to known development accounts/groups
-- Does not modify auth.users or auth_user_id mappings.

do $$ 
declare
  bas_persoon uuid;
  bas_profiel uuid;
  sanne_persoon uuid;
  sanne_profiel uuid;
  milan_persoon uuid;
  milan_profiel uuid;
  sam_persoon uuid;
  sam_profiel uuid;
  gijs_persoon uuid;
  gijs_profiel uuid;

  groep_iedereen uuid;
  groep_bewoners uuid;
  groep_medewerkers uuid;
  groep_gasten uuid;
  now_at timestamptz := now();
begin
  -- Known development users + linked profiles
  select p.id, pr.id
    into bas_persoon, bas_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'bas.beheerder@example.test'
  limit 1;

  select p.id, pr.id
    into sanne_persoon, sanne_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sanne.support@example.test'
  limit 1;

  select p.id, pr.id
    into milan_persoon, milan_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'milan.medewerker@example.test'
  limit 1;

  select p.id, pr.id
    into sam_persoon, sam_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sam.bewoner@example.test'
  limit 1;

  select p.id, pr.id
    into gijs_persoon, gijs_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'gijs.gast@example.test'
  limit 1;

  if bas_persoon is null or bas_profiel is null then
    raise exception 'Missing required development person/profile for bas.beheerder@example.test.';
  end if;

  if sanne_persoon is null or sanne_profiel is null then
    raise exception 'Missing required development person/profile for sanne.support@example.test.';
  end if;

  if milan_persoon is null or milan_profiel is null then
    raise exception 'Missing required development person/profile for milan.medewerker@example.test.';
  end if;

  if sam_persoon is null or sam_profiel is null then
    raise exception 'Missing required development person/profile for sam.bewoner@example.test.';
  end if;

  if gijs_persoon is null or gijs_profiel is null then
    raise exception 'Missing required development person/profile for gijs.gast@example.test.';
  end if;

  -- Known groups for visibility context
  select id
    into groep_iedereen
  from public.groepen
  where naam = 'Iedereen'
  limit 1;

  select id
    into groep_bewoners
  from public.groepen
  where naam = 'Bewoners'
  limit 1;

  select id
    into groep_medewerkers
  from public.groepen
  where naam = 'Medewerkers'
  limit 1;

  select id
    into groep_gasten
  from public.groepen
  where naam = 'Gasten'
  limit 1;

  if groep_iedereen is null then
    raise notice 'Known profile switch test group "Iedereen" not found. Skipping group-context rows.';
  end if;

  if groep_bewoners is null then
    raise notice 'Known profile switch test group "Bewoners" not found. Skipping group-context rows.';
  end if;

  if groep_medewerkers is null then
    raise notice 'Known profile switch test group "Medewerkers" not found. Skipping group-context rows.';
  end if;

  if groep_gasten is null then
    raise notice 'Known profile switch test group "Gasten" not found. Skipping group-context rows.';
  end if;

  -- Profile access scenarios (idempotent via active unique indexes).
  -- Bas Beheerder: multiple accessible profiles through profieltoegang.
  insert into public.profieltoegangen (
    id,
    persoon_id,
    profiel_id,
    toegangstype,
    status,
    verleend_door_persoon_id,
    verleend_at,
    updated_at
  ) values
    ('23000000-0000-4000-8000-000000000001', bas_persoon, sam_profiel, 'meekijken', 'actief', bas_persoon, now_at, now_at),
    ('23000000-0000-4000-8000-000000000002', bas_persoon, milan_profiel, 'meekijken', 'actief', bas_persoon, now_at, now_at)
  on conflict (id) do update
    set toegangstype = excluded.toegangstype,
        status = excluded.status,
        verleend_door_persoon_id = excluded.verleend_door_persoon_id,
        verleend_at = excluded.verleend_at,
        ingetrokken_at = null,
        ingetrokken_door_persoon_id = null,
        updated_at = excluded.updated_at;

  -- Milan Medewerker: toegang tot cliënt-/bewonerprofiel.
  insert into public.profieltoegangen (
    id,
    persoon_id,
    profiel_id,
    toegangstype,
    status,
    verleend_door_persoon_id,
    verleend_at,
    updated_at
  ) values (
    '23000000-0000-4000-8000-000000000003',
    milan_persoon,
    sam_profiel,
    'medewerker',
    'actief',
    bas_persoon,
    now_at,
    now_at
  )
  on conflict (id) do update
    set toegangstype = excluded.toegangstype,
        status = excluded.status,
        verleend_door_persoon_id = excluded.verleend_door_persoon_id,
        verleend_at = excluded.verleend_at,
        ingetrokken_at = null,
        ingetrokken_door_persoon_id = null,
        updated_at = excluded.updated_at;

  -- Sanne Systeemondersteuner: support-perspectief op Sam.
  insert into public.profieltoegangen (
    id,
    persoon_id,
    profiel_id,
    toegangstype,
    status,
    verleend_door_persoon_id,
    verleend_at,
    updated_at
  ) values (
    '23000000-0000-4000-8000-000000000004',
    sanne_persoon,
    sam_profiel,
    'begeleiding',
    'actief',
    bas_persoon,
    now_at,
    now_at
  )
  on conflict (id) do update
    set toegangstype = excluded.toegangstype,
        status = excluded.status,
        verleend_door_persoon_id = excluded.verleend_door_persoon_id,
        verleend_at = excluded.verleend_at,
        ingetrokken_at = null,
        ingetrokken_door_persoon_id = null,
        updated_at = excluded.updated_at;

  -- Visibility context:
  -- Bas krijgt geen algemene "eigen toegang" to meer groepen added, maar wél expliciete toegang
  -- tot een profieldoelgroep waar Sam niet in zit, zodat zichtbaarheidsverschillen toetsbaar blijven.
  if groep_medewerkers is not null then
    insert into public.groepslidmaatschappen (
      id,
      groep_id,
      profiel_id,
      status,
      toegevoegd_door_persoon_id,
      toegevoegd_at,
      updated_at
    ) values (
      '24000000-0000-4000-8000-000000000001',
      groep_medewerkers,
      bas_profiel,
      'actief',
      bas_persoon,
      now_at,
      now_at
    )
    on conflict (id) do update
      set status = excluded.status,
          toegevoegd_door_persoon_id = excluded.toegevoegd_door_persoon_id,
          toegevoegd_at = excluded.toegevoegd_at,
          verwijderd_at = null,
          updated_at = excluded.updated_at;
  end if;

  -- Keep guest context intact: explicitly do not add guest profile-toegang rows,
  -- so Gijs remains restricted to his own profiel context unless RLS policies expose explicit content.
  raise notice 'Profile context test data prepared: bas->sam/milan, milan->sam, sanne->sam, bas added to Medewerkers group.';
end $$;
