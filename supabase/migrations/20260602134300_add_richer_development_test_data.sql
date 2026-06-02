-- SAM&ZO migration: richer development test data for June 2026.
-- This migration only adds deterministic development data. It does not touch
-- auth.users, passwords, auth_user_id mappings, frontend secrets, or RLS.

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

  cat_maaltijd uuid;
  cat_activiteit uuid;
  cat_dienst uuid;
  cat_lijst uuid;
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

  if gijs_persoon is null or gijs_profiel is null then
    raise exception 'Missing required development person/profile for gijs.gast@example.test';
  end if;

  select id into groep_iedereen
  from public.groepen
  where naam = 'Iedereen'
  limit 1;

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

  if groep_iedereen is null then
    raise exception 'Missing required development group Iedereen';
  end if;

  if groep_bewoners is null then
    raise exception 'Missing required development group Bewoners';
  end if;

  if groep_medewerkers is null then
    raise exception 'Missing required development group Medewerkers';
  end if;

  if groep_gasten is null then
    raise exception 'Missing required development group Gasten';
  end if;

  select id into cat_maaltijd
  from public.categorieen
  where naam = 'Maaltijd'
    and entiteit_type = 'moment'
  limit 1;

  select id into cat_activiteit
  from public.categorieen
  where naam = 'Activiteit'
    and entiteit_type = 'moment'
  limit 1;

  select id into cat_dienst
  from public.categorieen
  where naam = 'Dienst'
    and entiteit_type = 'moment'
  limit 1;

  select id into cat_lijst
  from public.categorieen
  where naam = 'Praktische lijst'
    and entiteit_type = 'lijst'
  limit 1;

  if cat_maaltijd is null then
    raise exception 'Missing required development category Maaltijd';
  end if;

  if cat_activiteit is null then
    raise exception 'Missing required development category Activiteit';
  end if;

  if cat_dienst is null then
    raise exception 'Missing required development category Dienst';
  end if;

  if cat_lijst is null then
    raise exception 'Missing required development category Praktische lijst';
  end if;

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
  ) values
    (
      '45000000-0000-4000-8000-000000000001',
      'Weekmaaltijd vrijdag',
      'Rijk testmoment met bewoners, gasten, meerdere deelnamestatussen en maaltijdrollen.',
      cat_maaltijd,
      null,
      groep_bewoners,
      '2026-06-05 18:00:00+02',
      '2026-06-05 19:30:00+02',
      'Gemeenschappelijke eetkamer',
      'open',
      true,
      40,
      true,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    ),
    (
      '45000000-0000-4000-8000-000000000002',
      'Zwemuitje zaterdag',
      'Activiteit met begeleider, open ondersteunersrol en een rol met capaciteit.',
      cat_activiteit,
      null,
      groep_bewoners,
      '2026-06-06 14:00:00+02',
      '2026-06-06 16:00:00+02',
      'Zwembad',
      'open',
      true,
      12,
      false,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    ),
    (
      '45000000-0000-4000-8000-000000000003',
      'Avonddienst overdracht',
      'Medewerkersmoment voor dienstoverdracht met Milan en Sanne in rolcontext.',
      cat_dienst,
      null,
      groep_medewerkers,
      '2026-06-02 15:30:00+02',
      '2026-06-02 16:15:00+02',
      'Teamkamer',
      'gepland',
      false,
      null,
      false,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    ),
    (
      '45000000-0000-4000-8000-000000000004',
      'Koffie-inloop gasten',
      'Gasttoegankelijk testmoment voor Gijs en gastgerichte zichtbaarheid.',
      cat_activiteit,
      null,
      groep_gasten,
      '2026-06-08 10:30:00+02',
      '2026-06-08 11:30:00+02',
      'Ontmoetingsruimte',
      'open',
      true,
      20,
      true,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    ),
    (
      '45000000-0000-4000-8000-000000000005',
      'Creatieve ochtend open rol',
      'Bewonersactiviteit met voorgestelde deelname en een open rol om blokkades te testen.',
      cat_activiteit,
      null,
      groep_bewoners,
      '2026-06-04 10:00:00+02',
      '2026-06-04 11:30:00+02',
      'Atelier',
      'open',
      true,
      10,
      false,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    ),
    (
      '45000000-0000-4000-8000-000000000006',
      'Tuinmiddag met duo-rol',
      'Activiteit met een rolcapaciteit van twee, waarvan een plek gevuld blijft.',
      cat_activiteit,
      null,
      groep_bewoners,
      '2026-06-07 13:00:00+02',
      '2026-06-07 15:00:00+02',
      'Binnentuin',
      'open',
      true,
      18,
      true,
      '2026-06-02 08:00:00+02',
      bas_persoon,
      now(),
      bas_persoon
    )
  on conflict (id) do update set
    titel = excluded.titel,
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

  insert into public.moment_groepen (
    id,
    moment_id,
    groep_id,
    context_type
  ) values
    ('45100000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', groep_bewoners, 'bewoners'),
    ('45100000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000001', groep_medewerkers, 'uitvoering'),
    ('45100000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000001', groep_gasten, 'gasttoegang'),
    ('45100000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000002', groep_bewoners, 'bewoners'),
    ('45100000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000002', groep_medewerkers, 'begeleiding'),
    ('45100000-0000-4000-8000-000000000006', '45000000-0000-4000-8000-000000000003', groep_medewerkers, 'dienst'),
    ('45100000-0000-4000-8000-000000000007', '45000000-0000-4000-8000-000000000004', groep_gasten, 'gasttoegang'),
    ('45100000-0000-4000-8000-000000000008', '45000000-0000-4000-8000-000000000004', groep_bewoners, 'open_inloop'),
    ('45100000-0000-4000-8000-000000000009', '45000000-0000-4000-8000-000000000005', groep_bewoners, 'bewoners'),
    ('45100000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000006', groep_bewoners, 'bewoners'),
    ('45100000-0000-4000-8000-000000000011', '45000000-0000-4000-8000-000000000006', groep_medewerkers, 'begeleiding')
  on conflict (id) do update set
    moment_id = excluded.moment_id,
    groep_id = excluded.groep_id,
    context_type = excluded.context_type;

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    afgemeld_at,
    updated_at,
    archived_at
  ) values
    ('45200000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', sam_profiel, 'geaccepteerd', sam_persoon, sam_profiel, '2026-06-02 09:00:00+02', '2026-06-02 09:00:00+02', null, now(), null),
    ('45200000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000001', gijs_profiel, 'ingeschreven', gijs_persoon, gijs_profiel, '2026-06-02 09:10:00+02', '2026-06-02 09:10:00+02', null, now(), null),
    ('45200000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000001', milan_profiel, 'afgemeld', milan_persoon, milan_profiel, '2026-06-02 09:20:00+02', null, '2026-06-02 09:25:00+02', now(), null),
    ('45200000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000002', sam_profiel, 'ingeschreven', sam_persoon, sam_profiel, '2026-06-02 09:30:00+02', '2026-06-02 09:30:00+02', null, now(), null),
    ('45200000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000002', gijs_profiel, 'wachtlijst', gijs_persoon, gijs_profiel, '2026-06-02 09:35:00+02', null, null, now(), null),
    ('45200000-0000-4000-8000-000000000006', '45000000-0000-4000-8000-000000000004', gijs_profiel, 'geaccepteerd', gijs_persoon, gijs_profiel, '2026-06-02 09:40:00+02', '2026-06-02 09:40:00+02', null, now(), null),
    ('45200000-0000-4000-8000-000000000007', '45000000-0000-4000-8000-000000000004', sam_profiel, 'uitgenodigd', bas_persoon, sam_profiel, '2026-06-02 09:45:00+02', null, null, now(), null),
    ('45200000-0000-4000-8000-000000000008', '45000000-0000-4000-8000-000000000005', sam_profiel, 'voorgesteld', bas_persoon, sam_profiel, '2026-06-02 09:50:00+02', null, null, now(), null),
    ('45200000-0000-4000-8000-000000000009', '45000000-0000-4000-8000-000000000006', sam_profiel, 'ingeschreven', sam_persoon, sam_profiel, '2026-06-02 09:55:00+02', '2026-06-02 09:55:00+02', null, now(), null),
    ('45200000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000006', gijs_profiel, 'uitgenodigd', bas_persoon, gijs_profiel, '2026-06-02 10:00:00+02', null, null, now(), null)
  on conflict (moment_id, profiel_id) where archived_at is null do update set
    status = excluded.status,
    aangemeld_door_persoon_id = excluded.aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id = excluded.aangemeld_vanuit_profiel_id,
    status_updated_at = excluded.status_updated_at,
    geaccepteerd_at = excluded.geaccepteerd_at,
    afgemeld_at = excluded.afgemeld_at,
    updated_at = now();

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
  ) values
    ('45300000-0000-4000-8000-000000000001', '45000000-0000-4000-8000-000000000001', 'organisator', 'Organisator maaltijd', 'Bas bewaakt de maaltijdafspraken en start de avond.', 1, 1, groep_medewerkers, true, 'gevuld', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000002', '45000000-0000-4000-8000-000000000001', 'uitvoerder', 'Uitvoerder maaltijd', 'Praktische uitvoering rond tafels, eten en opruimen.', 1, 2, groep_medewerkers, false, 'incompleet', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000003', '45000000-0000-4000-8000-000000000002', 'begeleider', 'Begeleider zwemuitje', 'Begeleiding tijdens vervoer, omkleden en zwemmen.', 1, 1, groep_medewerkers, true, 'gevuld', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000004', '45000000-0000-4000-8000-000000000002', 'ondersteuner', 'Ondersteuner zwemuitje', 'Open rol voor iemand die extra rust en overzicht brengt.', 1, 1, groep_medewerkers, false, 'open', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000005', '45000000-0000-4000-8000-000000000003', 'organisator', 'Organisator avonddienst', 'Sanne houdt de dienstoverdracht bij elkaar.', 1, 1, groep_medewerkers, true, 'gevuld', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000006', '45000000-0000-4000-8000-000000000003', 'uitvoerder', 'Uitvoerder avonddienst', 'Milan voert de praktische overdracht uit.', 1, 1, groep_medewerkers, true, 'gevuld', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000007', '45000000-0000-4000-8000-000000000004', 'ondersteuner', 'Ondersteuner koffie-inloop', 'Open gastvrije rol voor de inloop.', 1, 1, groep_gasten, false, 'open', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000008', '45000000-0000-4000-8000-000000000005', 'ondersteuner', 'Ondersteuner creatieve ochtend', 'Open rol die Sam met voorgestelde deelname nog niet mag claimen.', 1, 1, groep_medewerkers, false, 'open', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000009', '45000000-0000-4000-8000-000000000006', 'begeleider', 'Begeleider tuinmiddag duo', 'Rol met twee plekken: een gevuld, een open.', 1, 2, groep_medewerkers, false, 'incompleet', bas_persoon, now()),
    ('45300000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000006', 'organisator', 'Organisator tuinmiddag', 'Bas organiseert de tuinmiddag.', 1, 1, groep_medewerkers, true, 'gevuld', bas_persoon, now())
  on conflict (id) do update set
    moment_id = excluded.moment_id,
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
  ) values
    ('45400000-0000-4000-8000-000000000001', '45300000-0000-4000-8000-000000000001', bas_profiel, 'actief', bas_persoon, '2026-06-02 10:10:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000002', '45300000-0000-4000-8000-000000000002', sanne_profiel, 'actief', sanne_persoon, '2026-06-02 10:15:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000003', '45300000-0000-4000-8000-000000000003', milan_profiel, 'actief', milan_persoon, '2026-06-02 10:20:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000004', '45300000-0000-4000-8000-000000000005', sanne_profiel, 'actief', sanne_persoon, '2026-06-02 10:25:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000005', '45300000-0000-4000-8000-000000000006', milan_profiel, 'actief', milan_persoon, '2026-06-02 10:30:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000006', '45300000-0000-4000-8000-000000000009', milan_profiel, 'actief', milan_persoon, '2026-06-02 10:35:00+02', null, now()),
    ('45400000-0000-4000-8000-000000000007', '45300000-0000-4000-8000-000000000010', bas_profiel, 'actief', bas_persoon, '2026-06-02 10:40:00+02', null, now())
  on conflict (momentrol_id, profiel_id) where status = 'actief' do update set
    status = excluded.status,
    geclaimd_door_persoon_id = excluded.geclaimd_door_persoon_id,
    geclaimd_at = excluded.geclaimd_at,
    afgemeld_at = excluded.afgemeld_at,
    updated_at = now();

  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    gekoppeld_moment_id,
    gekoppeld_doel_id,
    status,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values
    ('55000000-0000-4000-8000-000000000001', 'Vrijdagmaaltijd checklist', 'Praktische taken voor de weekmaaltijd.', cat_lijst, null, groep_bewoners, '45000000-0000-4000-8000-000000000001', null, 'open', bas_persoon, now(), bas_persoon),
    ('55000000-0000-4000-8000-000000000002', 'Zwemuitje voorbereiding', 'Voorbereiding en afronding voor het zwemuitje.', cat_lijst, null, groep_bewoners, '45000000-0000-4000-8000-000000000002', null, 'bezig', bas_persoon, now(), bas_persoon),
    ('55000000-0000-4000-8000-000000000003', 'Avonddienst workflow', 'Praktische overdrachtstaken voor de avonddienst.', cat_lijst, null, groep_medewerkers, '45000000-0000-4000-8000-000000000003', null, 'open', bas_persoon, now(), bas_persoon)
  on conflict (id) do update set
    titel = excluded.titel,
    beschrijving = excluded.beschrijving,
    categorie_id = excluded.categorie_id,
    eigenaar_profiel_id = excluded.eigenaar_profiel_id,
    eigenaar_groep_id = excluded.eigenaar_groep_id,
    gekoppeld_moment_id = excluded.gekoppeld_moment_id,
    gekoppeld_doel_id = excluded.gekoppeld_doel_id,
    status = excluded.status,
    updated_at = now(),
    updated_by_persoon_id = bas_persoon;

  insert into public.lijst_groepen (
    id,
    lijst_id,
    groep_id
  ) values
    ('55300000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', groep_bewoners),
    ('55300000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000001', groep_medewerkers),
    ('55300000-0000-4000-8000-000000000003', '55000000-0000-4000-8000-000000000001', groep_gasten),
    ('55300000-0000-4000-8000-000000000004', '55000000-0000-4000-8000-000000000002', groep_bewoners),
    ('55300000-0000-4000-8000-000000000005', '55000000-0000-4000-8000-000000000002', groep_medewerkers),
    ('55300000-0000-4000-8000-000000000006', '55000000-0000-4000-8000-000000000003', groep_medewerkers)
  on conflict (id) do update set
    lijst_id = excluded.lijst_id,
    groep_id = excluded.groep_id;

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    sort_order,
    deadline_at,
    afgerond_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values
    ('55100000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 'Tafels klaarzetten', 'Tafels en stoelen klaarzetten voor de maaltijd.', 'open', 1, '2026-06-05 17:15:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000002', '55000000-0000-4000-8000-000000000001', 'Eten ophalen', 'Maaltijdkarren ophalen bij de keuken.', 'open', 2, '2026-06-05 17:45:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000003', '55000000-0000-4000-8000-000000000001', 'Deelnemers welkom heten', 'Rustig welkom en zitplekken helpen vinden.', 'open', 3, '2026-06-05 18:00:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000004', '55000000-0000-4000-8000-000000000001', 'Borden opruimen', 'Na afloop borden verzamelen en afvoeren.', 'open', 4, '2026-06-05 19:20:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000005', '55000000-0000-4000-8000-000000000001', 'Ruimte afsluiten', 'Eetkamer nalopen en lichten uit.', 'open', 5, '2026-06-05 19:45:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000006', '55000000-0000-4000-8000-000000000002', 'Zwemtassen controleren', 'Controleer handdoeken, passen en droge kleding.', 'open', 1, '2026-06-06 12:30:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000007', '55000000-0000-4000-8000-000000000002', 'Busje controleren', 'Controleer sleutels, zitplaatsen en vertrektijd.', 'bezig', 2, '2026-06-06 13:00:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000008', '55000000-0000-4000-8000-000000000002', 'Deelnemers verzamelen', 'Iedereen rustig bij de ingang verzamelen.', 'open', 3, '2026-06-06 13:30:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000009', '55000000-0000-4000-8000-000000000002', 'Terugkomst opruimen', 'Natte spullen verzamelen en ruimte nalopen.', 'open', 4, '2026-06-06 16:15:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000010', '55000000-0000-4000-8000-000000000002', 'Korte terugkoppeling', 'Bijzonderheden kort delen met de dienst.', 'open', 5, '2026-06-06 16:30:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000011', '55000000-0000-4000-8000-000000000003', 'Ruimte klaarzetten', 'Teamkamer openen en overdrachtslijst klaarleggen.', 'open', 1, '2026-06-02 15:15:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000012', '55000000-0000-4000-8000-000000000003', 'Actiepunten nalopen', 'Openstaande punten voor de avonddienst verzamelen.', 'open', 2, '2026-06-02 15:25:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000013', '55000000-0000-4000-8000-000000000003', 'Telefoon overdragen', 'Diensttelefoon en bereikbaarheid controleren.', 'open', 3, '2026-06-02 16:00:00+02', null, bas_persoon, now(), bas_persoon),
    ('55100000-0000-4000-8000-000000000014', '55000000-0000-4000-8000-000000000003', 'Afsluiten en opruimen', 'Teamkamer netjes achterlaten.', 'open', 4, '2026-06-02 16:20:00+02', null, bas_persoon, now(), bas_persoon)
  on conflict (id) do update set
    lijst_id = excluded.lijst_id,
    titel = excluded.titel,
    beschrijving = excluded.beschrijving,
    status = excluded.status,
    sort_order = excluded.sort_order,
    deadline_at = excluded.deadline_at,
    afgerond_at = excluded.afgerond_at,
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
  ) values
    ('55200000-0000-4000-8000-000000000001', '55100000-0000-4000-8000-000000000001', sam_profiel, 'actief', sam_persoon, '2026-06-02 11:00:00+02', null, now()),
    ('55200000-0000-4000-8000-000000000002', '55100000-0000-4000-8000-000000000007', milan_profiel, 'actief', milan_persoon, '2026-06-02 11:05:00+02', null, now()),
    ('55200000-0000-4000-8000-000000000003', '55100000-0000-4000-8000-000000000011', sanne_profiel, 'actief', sanne_persoon, '2026-06-02 11:10:00+02', null, now())
  on conflict (taak_id, profiel_id) do update set
    status = excluded.status,
    geclaimd_door_persoon_id = excluded.geclaimd_door_persoon_id,
    geclaimd_at = excluded.geclaimd_at,
    afgerond_at = excluded.afgerond_at,
    updated_at = now();
end $$;
