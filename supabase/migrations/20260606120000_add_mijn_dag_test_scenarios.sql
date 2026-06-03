-- SAM&ZO migration: deterministic Mijn dag test scenarios for June 2026.
-- Scope: development-only dataset for functional frontend checks.
-- Includes stable UUIDs, idempotent inserts, no auth or RLS/schema changes.

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

  groep_bewoners uuid;
  groep_medewerkers uuid;
  groep_gasten uuid;
  cat_activiteit uuid;
  cat_lijst uuid;
  now_at timestamptz := '2026-06-01 08:00:00+02'::timestamptz;
begin
  -- Required development users and profiles
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

  if gijs_persoon is null or gijs_profiel is null then
    raise exception 'Missing required development person/profile for gijs.gast@example.test';
  end if;

  select id into groep_bewoners
  from public.groepen
  where naam = 'Bewoners'
  limit 1;

  select id into groep_medewerkers
  from public.groepen
  where naam = 'Medewerkers'
  limit 1;

  select id into groep_gasten
  from public.groepen
  where naam = 'Gasten'
  limit 1;

  if groep_bewoners is null then
    raise exception 'Missing required development group "Bewoners"';
  end if;

  if groep_medewerkers is null then
    raise exception 'Missing required development group "Medewerkers"';
  end if;

  if groep_gasten is null then
    raise exception 'Missing required development group "Gasten"';
  end if;

  select id into cat_activiteit
  from public.categorieen
  where naam = 'Activiteit'
    and entiteit_type = 'moment'
  limit 1;

  select id into cat_lijst
  from public.categorieen
  where naam = 'Praktische lijst'
    and entiteit_type = 'lijst'
  limit 1;

  if cat_activiteit is null then
    raise exception 'Missing required moment category "Activiteit"';
  end if;

  if cat_lijst is null then
    raise exception 'Missing required list category "Praktische lijst"';
  end if;

  -- Scenario A: active day with only one personal moment (Sam, 3 June 2026).
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000001',
    'Persoonlijk rustige ochtend',
    'Alleen actieve deelname voor een heldere Mijn dag basiscontrole.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-03 08:30:00+02',
    '2026-06-03 10:00:00+02',
    'Zonnetuin',
    'open',
    true,
    false,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.moment_groepen (id, moment_id, groep_id, context_type)
  values (
    '48000000-0000-4000-8000-000000000001',
    '47000000-0000-4000-8000-000000000001',
    groep_bewoners,
    'bewoners'
  )
  on conflict (moment_id, groep_id) do update
    set context_type = excluded.context_type;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000001',
    '47000000-0000-4000-8000-000000000001',
    sam_profiel,
    'geaccepteerd',
    bas_persoon,
    bas_profiel,
    now_at,
    now_at,
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = excluded.geaccepteerd_at,
      geweigerd_at = excluded.geweigerd_at,
      afgemeld_at = excluded.afgemeld_at,
      updated_at = now();

  -- Scenario B: open proposal day for Sam (4 June 2026), linked as proposal-like deelname.
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000002',
    'Plan met voorstel',
    'Dag met open voorstel dat als Mijn dag actie hoort te tonen.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-04 09:30:00+02',
    '2026-06-04 11:30:00+02',
    'Avondzaal',
    'open',
    true,
    false,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.moment_groepen (id, moment_id, groep_id, context_type)
  values (
    '48000000-0000-4000-8000-000000000002',
    '47000000-0000-4000-8000-000000000002',
    groep_bewoners,
    'bewoners'
  )
  on conflict (moment_id, groep_id) do update
    set context_type = excluded.context_type;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000002',
    '47000000-0000-4000-8000-000000000002',
    sam_profiel,
    'voorgesteld',
    bas_persoon,
    bas_profiel,
    now_at,
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = null,
      geweigerd_at = null,
      afgemeld_at = null,
      updated_at = now();

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
    geweigerd_at,
    ingetrokken_at
  ) values (
    '45600000-0000-4000-8000-000000000101',
    'deelname_aan_moment',
    'open',
    sam_profiel,
    bas_persoon,
    bas_profiel,
    'Uitnodiging voor Plan met voorstel',
    'Open voorstel op maandag om Mijn dag actielogica te valideren.',
    'moment',
    '47000000-0000-4000-8000-000000000002',
    now_at - interval '1 hour',
    now(),
    null,
    null,
    null
  )
  on conflict (id) do update
    set type = excluded.type,
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
      geweigerd_at = excluded.geweigerd_at,
      ingetrokken_at = excluded.ingetrokken_at;

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000003',
    'Taakdag met open taken',
    'Dag met twee eigen taken, een afgeronde taak om uit te sluiten.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-05 09:00:00+02',
    '2026-06-05 12:00:00+02',
    'Werkruimte',
    'open',
    false,
    false,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  -- Scenario C/F: task day and completed-task safety check (5 June 2026).
  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    gekoppeld_moment_id,
    status,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '56000000-0000-4000-8000-000000000101',
    'Mijn-dag testlijst',
    'Takencontext voor task-scenario van Mijn dag.',
    cat_lijst,
    null,
    groep_bewoners,
    '47000000-0000-4000-8000-000000000003',
    'open',
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      gekoppeld_moment_id = excluded.gekoppeld_moment_id,
      status = excluded.status,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    sort_order,
    deadline_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '56100000-0000-4000-8000-000000000101',
    '56000000-0000-4000-8000-000000000101',
    'Sam: open taak',
    'Open taak die zichtbaar moet zijn in Mijn dag.',
    'open',
    1,
    '2026-06-05 10:30:00+02',
    bas_persoon,
    now(),
    bas_persoon
  ),
  (
    '56100000-0000-4000-8000-000000000102',
    '56000000-0000-4000-8000-000000000101',
    'Andermans taak',
    'Niet relevant voor Sam, geen Mijn dag item voor dit profiel.',
    'open',
    2,
    '2026-06-05 12:00:00+02',
    bas_persoon,
    now(),
    bas_persoon
  ),
  (
    '56100000-0000-4000-8000-000000000103',
    '56000000-0000-4000-8000-000000000101',
    'Sam: afgeronde taak',
    'Deze taak moet niet meer als actief Mijn dag item terugkomen.',
    'afgerond',
    3,
    '2026-06-05 14:00:00+02',
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set lijst_id = excluded.lijst_id,
      titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      status = excluded.status,
      sort_order = excluded.sort_order,
      deadline_at = excluded.deadline_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000003',
    'Taakdag met open taken',
    'Dag met twee eigen taken, een afgeronde taak om uit te sluiten.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-05 09:00:00+02',
    '2026-06-05 12:00:00+02',
    'Werkruimte',
    'open',
    false,
    false,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.taakuitvoerders (
    id,
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    afgerond_at,
    updated_at
  ) values (
    '56200000-0000-4000-8000-000000000101',
    '56100000-0000-4000-8000-000000000101',
    sam_profiel,
    'actief',
    sam_persoon,
    '2026-06-05 09:05:00+02',
    null,
    now()
  ),
  (
    '56200000-0000-4000-8000-000000000102',
    '56100000-0000-4000-8000-000000000103',
    sam_profiel,
    'actief',
    sam_persoon,
    '2026-06-05 13:00:00+02',
    now(),
    now()
  ),
  (
    '56200000-0000-4000-8000-000000000103',
    '56100000-0000-4000-8000-000000000102',
    milan_profiel,
    'actief',
    milan_persoon,
    '2026-06-05 10:00:00+02',
    null,
    now()
  )
  on conflict (taak_id, profiel_id) do update
    set status = excluded.status,
      geclaimd_door_persoon_id = excluded.geclaimd_door_persoon_id,
      geclaimd_at = excluded.geclaimd_at,
      afgerond_at = excluded.afgerond_at,
      updated_at = now();

  -- Scenario D/E/G: role claim + claim priority + guest & support/tijdlijn attention day.
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    capaciteit,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000004',
    'Rol dag met Sam als deelnemer',
    'Deelname plus actieve rolbezetting voor dezelfde momentcontrole.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-06 13:30:00+02',
    '2026-06-06 15:00:00+02',
    'Zaal',
    'open',
    true,
    12,
    true,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      capaciteit = excluded.capaciteit,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.momentrollen (
    id,
    moment_id,
    roltype,
    titel,
    omschrijving,
    minimum_aantal,
    maximum_aantal,
    zichtbaar_voor_groep_id,
    verplicht_voor_doorgang,
    status,
    created_by_persoon_id,
    updated_at
  ) values (
    '46300000-0000-4000-8000-000000000101',
    '47000000-0000-4000-8000-000000000004',
    'begeleider',
    'Begeleider rol claim',
    'Rol met persoonlijke prioriteit op Mijn dag.',
    1,
    1,
    groep_medewerkers,
    false,
    'open',
    bas_persoon,
    now()
  )
  on conflict (id) do update
    set moment_id = excluded.moment_id,
      roltype = excluded.roltype,
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      minimum_aantal = excluded.minimum_aantal,
      maximum_aantal = excluded.maximum_aantal,
      zichtbaar_voor_groep_id = excluded.zichtbaar_voor_groep_id,
      verplicht_voor_doorgang = excluded.verplicht_voor_doorgang,
      status = excluded.status,
      updated_at = now();

  insert into public.rolbezettingen (
    id,
    momentrol_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    afgemeld_at,
    updated_at
  ) values (
    '46400000-0000-4000-8000-000000000101',
    '46300000-0000-4000-8000-000000000101',
    sam_profiel,
    'actief',
    bas_persoon,
    '2026-06-06 09:30:00+02',
    null,
    now()
  )
  on conflict (momentrol_id, profiel_id) where status = 'actief' do update
    set status = excluded.status,
      geclaimd_door_persoon_id = excluded.geclaimd_door_persoon_id,
      geclaimd_at = excluded.geclaimd_at,
      afgemeld_at = excluded.afgemeld_at,
      updated_at = now();

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000003',
    '47000000-0000-4000-8000-000000000004',
    sam_profiel,
    'geaccepteerd',
    bas_persoon,
    bas_profiel,
    now_at,
    now_at,
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = excluded.geaccepteerd_at,
      geweigerd_at = null,
      afgemeld_at = null,
      updated_at = now();

  insert into public.supportvragen (
    id,
    aangemaakt_door_persoon_id,
    aangemaakt_vanuit_profiel_id,
    onderwerp,
    omschrijving,
    status,
    toegewezen_aan_persoon_id,
    created_at,
    updated_at
  ) values (
    '45700000-0000-4000-8000-000000000101',
    bas_persoon,
    bas_profiel,
    'Aandacht: open rolverzoek',
    'Tijdlijn aandacht is nodig voor de role-day flow.',
    'actie_nodig',
    sanne_persoon,
    '2026-06-07 08:20:00+02',
    now()
  )
  on conflict (id) do update
    set aangemaakt_door_persoon_id = excluded.aangemaakt_door_persoon_id,
      aangemaakt_vanuit_profiel_id = excluded.aangemaakt_vanuit_profiel_id,
      onderwerp = excluded.onderwerp,
      omschrijving = excluded.omschrijving,
      status = excluded.status,
      toegewezen_aan_persoon_id = excluded.toegewezen_aan_persoon_id,
      updated_at = now();

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gekoppeld_type,
    gekoppeld_id,
    created_by_persoon_id,
    created_at
  ) values (
    '45700000-0000-4000-8000-000000000201',
    'aandacht_nodig',
    'zichtbaar',
    'Aandacht voor Bas',
    'Signalering gericht op Bas voor snelle aandacht in Mijn dag.',
    bas_profiel,
    null,
    null,
    bas_persoon,
    '2026-06-07 08:25:00+02'
  )
  on conflict (id) do update
    set niveau = excluded.niveau,
      status = excluded.status,
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      gericht_aan_profiel_id = excluded.gericht_aan_profiel_id,
      gekoppeld_type = excluded.gekoppeld_type,
      gekoppeld_id = excluded.gekoppeld_id,
      created_by_persoon_id = excluded.created_by_persoon_id;

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gekoppeld_type,
    gekoppeld_id,
    created_by_persoon_id,
    created_at
  ) values (
    '45700000-0000-4000-8000-000000000202',
    'actie_nodig',
    'zichtbaar',
    'Aandacht voor Sanne',
    'Signalering gericht op Sanne voor supportgerichte controles.',
    sanne_profiel,
    null,
    null,
    bas_persoon,
    '2026-06-07 08:30:00+02'
  )
  on conflict (id) do update
    set niveau = excluded.niveau,
      status = excluded.status,
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      gericht_aan_profiel_id = excluded.gericht_aan_profiel_id,
      gekoppeld_type = excluded.gekoppeld_type,
      gekoppeld_id = excluded.gekoppeld_id,
      created_by_persoon_id = excluded.created_by_persoon_id;

  insert into public.tijdlijnberichten (
    id,
    type,
    status,
    titel,
    inhoud,
    afzender_persoon_id,
    afzender_profiel_id,
    gericht_aan_profiel_id,
    urgent,
    zichtbaar_vanaf_at,
    created_at,
    updated_at
  ) values (
    '45800000-0000-4000-8000-000000000101',
    'urgent_signaal',
    'actie_nodig',
    'Tijdlijn alert: aandacht nodig',
    'Urgente aandachtsnote voor Bas in Mijn dag op 7 juni.',
    bas_persoon,
    bas_profiel,
    bas_profiel,
    true,
    '2026-06-07 08:35:00+02',
    '2026-06-07 08:35:00+02',
    now()
  )
  on conflict (id) do update
    set type = excluded.type,
      status = excluded.status,
      titel = excluded.titel,
      inhoud = excluded.inhoud,
      afzender_persoon_id = excluded.afzender_persoon_id,
      afzender_profiel_id = excluded.afzender_profiel_id,
      gericht_aan_profiel_id = excluded.gericht_aan_profiel_id,
      urgent = excluded.urgent,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now();

  -- Scenario H (optional): guest-only moment, guest context test.
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000005',
    'Gastavond',
    'Open gastmoment met gasttoegang en minimale context.',
    cat_activiteit,
    null,
    groep_gasten,
    '2026-06-08 18:00:00+02',
    '2026-06-08 20:00:00+02',
    'Ontvangstruimte',
    'open',
    true,
    true,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000004',
    '47000000-0000-4000-8000-000000000005',
    gijs_profiel,
    'ingeschreven',
    gijs_persoon,
    gijs_profiel,
    now_at,
    now_at,
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = excluded.geaccepteerd_at,
      geweigerd_at = null,
      afgemeld_at = null,
      updated_at = now();

  -- Scenario G: rejected proposal with actionable moment still present for manual register retry (9 June 2026).
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    capaciteit,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000006',
    'Herstelmoment',
    'Scenario voor geweigerde deelname met handmatige heraanmelding.',
    cat_activiteit,
    null,
    groep_bewoners,
    '2026-06-09 15:00:00+02',
    '2026-06-09 17:00:00+02',
    'Buitenruimte',
    'open',
    true,
    20,
    false,
    now_at,
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      capaciteit = excluded.capaciteit,
      gasttoegang = excluded.gasttoegang,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geweigerd_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000005',
    '47000000-0000-4000-8000-000000000006',
    sam_profiel,
    'geweigerd',
    bas_persoon,
    bas_profiel,
    now_at - interval '1 day',
    now_at - interval '1 day',
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = null,
      geweigerd_at = excluded.geweigerd_at,
      afgemeld_at = null,
      updated_at = now();

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
    geweigerd_at,
    ingetrokken_at
  ) values (
    '45600000-0000-4000-8000-000000000102',
    'deelname_aan_moment',
    'geweigerd',
    sam_profiel,
    bas_persoon,
    bas_profiel,
    'Uitnodiging geweigerd',
    'Scenario voor heraanmelding in handmatige flow.',
    'moment',
    '47000000-0000-4000-8000-000000000006',
    now_at - interval '2 days',
    now(),
    null,
    now_at - interval '1 day',
    null
  )
  on conflict (id) do update
    set type = excluded.type,
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
      geweigerd_at = excluded.geweigerd_at,
      ingetrokken_at = excluded.ingetrokken_at;

  -- Scenario J: different outcome for a different profile (10 June 2026).
  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '47000000-0000-4000-8000-000000000007',
    'Alleen Milan actief',
    'Verschil in profieluitkomsten: Milan ziet dit, Sam niet.',
    cat_activiteit,
    null,
    groep_medewerkers,
    '2026-06-10 13:30:00+02',
    '2026-06-10 15:00:00+02',
    'Vergaderkamer',
    'open',
    true,
    false,
    '2026-06-10 08:00:00+02',
    bas_persoon,
    now(),
    bas_persoon
  )
  on conflict (id) do update
    set titel = excluded.titel,
      beschrijving = excluded.beschrijving,
      categorie_id = excluded.categorie_id,
      eigenaar_profiel_id = excluded.eigenaar_profiel_id,
      eigenaar_groep_id = excluded.eigenaar_groep_id,
      start_at = excluded.start_at,
      eind_at = excluded.eind_at,
      locatie = excluded.locatie,
      status = excluded.status,
      inschrijving_open = excluded.inschrijving_open,
      zichtbaar_vanaf_at = excluded.zichtbaar_vanaf_at,
      gasttoegang = excluded.gasttoegang,
      updated_at = now(),
      updated_by_persoon_id = bas_persoon;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    updated_at
  ) values (
    '48200000-0000-4000-8000-000000000007',
    '47000000-0000-4000-8000-000000000007',
    milan_profiel,
    'geaccepteerd',
    bas_persoon,
    bas_profiel,
    now_at,
    now_at,
    now()
  )
  on conflict (moment_id, profiel_id) where archived_at is null do update
    set status = excluded.status,
      aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
      aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
      status_updated_at = excluded.status_updated_at,
      geaccepteerd_at = excluded.geaccepteerd_at,
      geweigerd_at = null,
      afgemeld_at = null,
      updated_at = now();
end $$;
