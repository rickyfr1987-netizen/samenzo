-- SAM&ZO migration: development proposal seed data for local/test environments.
-- Adds a small set of representative proposals for existing test profiles.

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
  now_at timestamptz := now();
  guest_context_valid boolean := false;
begin
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
    raise exception 'Missing required development person/profile for bas.beheerder@example.test';
  end if;

  if sanne_persoon is null or sanne_profiel is null then
    raise exception 'Missing required development person/profile for sanne.support@example.test';
  end if;

  if milan_persoon is null or milan_profiel is null then
    raise exception 'Missing required development person/profile for milan.medewerker@example.test';
  end if;

  if sam_persoon is null or sam_profiel is null then
    raise exception 'Missing required development person/profile for sam.bewoner@example.test';
  end if;

  guest_context_valid := gijs_persoon is not null and gijs_profiel is not null;

  if exists (select 1 from public.voorstellen) then
    raise notice 'Proposal seed skipped: proposals already exist in database.';
    return;
  end if;

  insert into public.voorstellen (
    id,
    type,
    status,
    ontvangend_profiel_id,
    voorgesteld_door_persoon_id,
    voorgesteld_vanuit_profiel_id,
    titel,
    toelichting,
    gekoppeld_type,
    gekoppeld_id,
    created_at,
    updated_at,
    geaccepteerd_at,
    geweigerd_at
  ) values
    (
      '45500000-0000-4000-8000-000000000001',
      'deelname_aan_moment',
      'open',
      sam_profiel,
      bas_persoon,
      bas_profiel,
      'Uitnodiging voor Weekmaaltijd',
      'Toekomstige deelname die direct kan worden geaccepteerd.',
      'moment',
      '45000000-0000-4000-8000-000000000001',
      now_at,
      null,
      null,
      null
    ),
    (
      '45500000-0000-4000-8000-000000000002',
      'uitnodiging_moment',
      'open',
      sam_profiel,
      milan_persoon,
      milan_profiel,
      'Uitnodiging Zwemuitje',
      'Persoonlijke uitnodiging voor deelname aan het uitje.',
      'moment',
      '45000000-0000-4000-8000-000000000002',
      now_at - interval '1 hour',
      null,
      null,
      null
    ),
    (
      '45500000-0000-4000-8000-000000000003',
      'deelname_aan_moment',
      'open',
      sam_profiel,
      sanne_persoon,
      sanne_profiel,
      'Aanvullend Voorstel: creatieve ochtend',
      'Nog een open voorstel zodat Sam een voorstel kan afwijzen.',
      'moment',
      '45000000-0000-4000-8000-000000000005',
      now_at - interval '30 minutes',
      null,
      null,
      null
    ),
    (
      '45500000-0000-4000-8000-000000000004',
      'deelname_aan_moment',
      'geaccepteerd',
      milan_profiel,
      sanne_persoon,
      sanne_profiel,
      'Accepteren zichtbaar testvoorstel',
      'Geaccepteerd voorbeeld om statusweergave te tonen.',
      'moment',
      '45000000-0000-4000-8000-000000000004',
      now_at - interval '3 days',
      now_at - interval '2 days',
      now_at - interval '2 days',
      null
    ),
    (
      '45500000-0000-4000-8000-000000000005',
      'deelname_aan_moment',
      'geweigerd',
      sanne_profiel,
      bas_persoon,
      bas_profiel,
      'Afgewezen voorbeeld',
      'Historiek van afgewezen voorstel zichtbaar voor controle.',
      'moment',
      '45000000-0000-4000-8000-000000000006',
      now_at - interval '2 days',
      now_at - interval '1 day',
      null,
      now_at - interval '1 day'
    )
  on conflict (id) do update set
    type = excluded.type,
    status = excluded.status,
    ontvangend_profiel_id = excluded.ontvangend_profiel_id,
    voorgesteld_door_persoon_id = excluded.voorgesteld_door_persoon_id,
    voorgesteld_vanuit_profiel_id = excluded.voorgesteld_vanuit_profiel_id,
    titel = excluded.titel,
    toelichting = excluded.toelichting,
    gekoppeld_type = excluded.gekoppeld_type,
    gekoppeld_id = excluded.gekoppeld_id,
    updated_at = now(),
    geaccepteerd_at = excluded.geaccepteerd_at,
    geweigerd_at = excluded.geweigerd_at;

  if guest_context_valid then
    insert into public.voorstellen (
      id,
      type,
      status,
      ontvangend_profiel_id,
      voorgesteld_door_persoon_id,
      voorgesteld_vanuit_profiel_id,
      titel,
      toelichting,
      gekoppeld_type,
      gekoppeld_id,
      created_at,
      updated_at
    ) values (
      '45500000-0000-4000-8000-000000000006',
      'uitnodiging_moment',
      'open',
      gijs_profiel,
      bas_persoon,
      bas_profiel,
      'Gastvoorstel Koffie-inloop',
      'Kleine testzin om gastcontext op voorstellen zichtbaar te houden.',
      'moment',
      '45000000-0000-4000-8000-000000000004',
      now_at - interval '45 minutes',
      now_at - interval '45 minutes'
    )
    on conflict (id) do update set
      type = excluded.type,
      status = excluded.status,
      ontvangend_profiel_id = excluded.ontvangend_profiel_id,
      voorgesteld_door_persoon_id = excluded.voorgesteld_door_persoon_id,
      voorgesteld_vanuit_profiel_id = excluded.voorgesteld_vanuit_profiel_id,
      titel = excluded.titel,
      toelichting = excluded.toelichting,
      gekoppeld_type = excluded.gekoppeld_type,
      gekoppeld_id = excluded.gekoppeld_id,
      updated_at = now();
  end if;
end $$;
