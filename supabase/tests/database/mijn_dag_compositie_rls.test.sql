begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(18);

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '90000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'bas.beheerder@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '90000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'milan.medewerker@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '90000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'sam.bewoner@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '90000000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    'gijs.gast@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000001'
where email = 'bas.beheerder@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000003'
where email = 'milan.medewerker@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000004'
where email = 'sam.bewoner@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000005'
where email = 'gijs.gast@example.test';

do $$
declare
  bas_persoon uuid;
  bas_profiel uuid;
  milan_persoon uuid;
  milan_profiel uuid;
  sam_persoon uuid;
  sam_profiel uuid;
  groep_bewoners uuid;
  groep_medewerkers uuid;
  cat_moment uuid;
  cat_lijst uuid;
begin
  select p.id, pr.id
    into bas_persoon, bas_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'bas.beheerder@example.test'
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
    into cat_moment
  from public.categorieen
  where entiteit_type = 'moment'
    and status = 'actief'
  order by naam
  limit 1;

  select id
    into cat_lijst
  from public.categorieen
  where entiteit_type = 'lijst'
    and status = 'actief'
  order by naam
  limit 1;

  if bas_persoon is null or bas_profiel is null then
    raise exception 'Missing Bas Beheerder test profile.';
  end if;

  if milan_persoon is null or milan_profiel is null then
    raise exception 'Missing Milan Medewerker test profile.';
  end if;

  if sam_persoon is null or sam_profiel is null then
    raise exception 'Missing Sam Bewoner test profile.';
  end if;

  if groep_bewoners is null or groep_medewerkers is null then
    raise exception 'Missing required groups for Mijn dag composition tests.';
  end if;

  if cat_moment is null or cat_lijst is null then
    raise exception 'Missing required categories for Mijn dag composition tests.';
  end if;

  insert into public.groepslidmaatschappen (
    id,
    groep_id,
    profiel_id,
    status,
    toegevoegd_door_persoon_id
  ) values (
    '89000000-0000-4000-8000-000000000001',
    groep_bewoners,
    sam_profiel,
    'actief',
    bas_persoon
  )
  on conflict (id) do update
    set groep_id = excluded.groep_id,
      profiel_id = excluded.profiel_id,
      status = excluded.status,
      updated_at = now();

  insert into public.groepslidmaatschappen (
    id,
    groep_id,
    profiel_id,
    status,
    toegevoegd_door_persoon_id
  ) values (
    '89000000-0000-4000-8000-000000000002',
    groep_medewerkers,
    milan_profiel,
    'actief',
    bas_persoon
  )
  on conflict (id) do update
    set groep_id = excluded.groep_id,
      profiel_id = excluded.profiel_id,
      status = excluded.status,
      updated_at = now();

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values (
    '89010000-0000-4000-8000-000000000001',
    '2C Sam definitieve deelname',
    'Rollback-testdata voor Mijn dag deelnamepad.',
    cat_moment,
    groep_bewoners,
    '2026-06-10 09:00:00+02',
    '2026-06-10 10:00:00+02',
    'Huiskamer',
    'open',
    false,
    false,
    '2026-06-01 08:00:00+02',
    bas_persoon
  );

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at
  ) values (
    '89020000-0000-4000-8000-000000000001',
    '89010000-0000-4000-8000-000000000001',
    sam_profiel,
    'geaccepteerd',
    bas_persoon,
    bas_profiel,
    '2026-06-01 08:10:00+02',
    '2026-06-01 08:10:00+02'
  );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values (
    '89010000-0000-4000-8000-000000000002',
    '2C Milan deelname niet Sam',
    'Controle dat andermans deelname geen Sam-item wordt.',
    cat_moment,
    groep_medewerkers,
    '2026-06-10 11:00:00+02',
    '2026-06-10 12:00:00+02',
    'Teamkamer',
    'open',
    false,
    false,
    '2026-06-01 08:00:00+02',
    bas_persoon
  );

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at
  ) values (
    '89020000-0000-4000-8000-000000000002',
    '89010000-0000-4000-8000-000000000002',
    milan_profiel,
    'geaccepteerd',
    bas_persoon,
    bas_profiel,
    '2026-06-01 08:15:00+02',
    '2026-06-01 08:15:00+02'
  );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values (
    '89010000-0000-4000-8000-000000000003',
    '2C Milan rolbezetting',
    'Rollback-testdata voor Mijn dag rolpad.',
    cat_moment,
    groep_medewerkers,
    '2026-06-10 13:00:00+02',
    '2026-06-10 14:00:00+02',
    'Atelier',
    'open',
    false,
    false,
    '2026-06-01 08:00:00+02',
    bas_persoon
  );

  insert into public.momentrollen (
    id,
    moment_id,
    roltype,
    titel,
    minimum_aantal,
    maximum_aantal,
    status,
    created_by_persoon_id
  ) values (
    '89030000-0000-4000-8000-000000000001',
    '89010000-0000-4000-8000-000000000003',
    'begeleider',
    'Begeleider',
    1,
    1,
    'open',
    bas_persoon
  );

  insert into public.rolbezettingen (
    id,
    momentrol_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at
  ) values (
    '89040000-0000-4000-8000-000000000001',
    '89030000-0000-4000-8000-000000000001',
    milan_profiel,
    'actief',
    milan_persoon,
    '2026-06-01 08:20:00+02'
  );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values (
    '89010000-0000-4000-8000-000000000004',
    '2C Sam open voorstel',
    'Rollback-testdata voor Mijn dag voorstelpad.',
    cat_moment,
    groep_bewoners,
    '2026-06-10 15:00:00+02',
    '2026-06-10 16:00:00+02',
    'Keuken',
    'open',
    false,
    false,
    '2026-06-01 08:00:00+02',
    bas_persoon
  );

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
    created_at
  ) values (
    '89050000-0000-4000-8000-000000000001',
    'deelname_aan_moment',
    'open',
    sam_profiel,
    bas_persoon,
    bas_profiel,
    '2C voorstel voor Sam',
    'Open voorstel blijft aandacht, geen definitieve deelname.',
    'moment',
    '89010000-0000-4000-8000-000000000004',
    '2026-06-01 08:25:00+02'
  );

  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    status,
    created_by_persoon_id
  ) values (
    '89060000-0000-4000-8000-000000000001',
    '2C Sam takenlijst',
    'Rollback-testlijst voor Sam.',
    cat_lijst,
    sam_profiel,
    'open',
    bas_persoon
  );

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    deadline_at,
    created_by_persoon_id
  ) values (
    '89070000-0000-4000-8000-000000000001',
    '89060000-0000-4000-8000-000000000001',
    '2C Sam actieve taak',
    'Read-only taak voor Mijn dag.',
    'open',
    '2026-06-10 17:00:00+02',
    bas_persoon
  );

  insert into public.taakuitvoerders (
    id,
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at
  ) values (
    '89080000-0000-4000-8000-000000000001',
    '89070000-0000-4000-8000-000000000001',
    sam_profiel,
    'actief',
    sam_persoon,
    '2026-06-01 08:30:00+02'
  );

  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    status,
    created_by_persoon_id
  ) values (
    '89060000-0000-4000-8000-000000000002',
    '2C Milan takenlijst',
    'Controle dat andermans taak geen Sam-item wordt.',
    cat_lijst,
    milan_profiel,
    'open',
    bas_persoon
  );

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    deadline_at,
    created_by_persoon_id
  ) values (
    '89070000-0000-4000-8000-000000000002',
    '89060000-0000-4000-8000-000000000002',
    '2C Milan taak',
    'Andermans taak mag geen Sam Mijn dag-item worden.',
    'open',
    '2026-06-10 18:00:00+02',
    bas_persoon
  );

  insert into public.taakuitvoerders (
    id,
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at
  ) values (
    '89080000-0000-4000-8000-000000000002',
    '89070000-0000-4000-8000-000000000002',
    milan_profiel,
    'actief',
    milan_persoon,
    '2026-06-01 08:35:00+02'
  );

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gericht_aan_groep_id,
    created_by_persoon_id,
    created_at
  ) values (
    '89090000-0000-4000-8000-000000000001',
    'actie_nodig',
    'nieuw',
    '2C profielgerichte aandacht voor Sam',
    'Profielgerichte aandacht voor Mijn dag.',
    sam_profiel,
    null,
    bas_persoon,
    '2026-06-10 08:00:00+02'
  );

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gericht_aan_groep_id,
    created_by_persoon_id,
    created_at
  ) values (
    '89090000-0000-4000-8000-000000000002',
    'actie_nodig',
    'nieuw',
    '2C groepsgerichte aandacht Bewoners',
    'Groepscontext alleen is geen persoonlijk Mijn dag-item.',
    null,
    groep_bewoners,
    bas_persoon,
    '2026-06-10 08:05:00+02'
  );

  insert into public.supportvragen (
    id,
    aangemaakt_door_persoon_id,
    aangemaakt_vanuit_profiel_id,
    onderwerp,
    omschrijving,
    status,
    created_at
  ) values (
    '89100000-0000-4000-8000-000000000001',
    sam_persoon,
    sam_profiel,
    '2C support aandacht Sam',
    'Support blijft tijdlijn-aandacht en geen ticketsysteem.',
    'nieuw',
    '2026-06-10 08:15:00+02'
  );
end $$;

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '89020000-0000-4000-8000-000000000001'
      and status = 'geaccepteerd'
  ),
  1,
  'setup: rollback testdata contains Sam accepted participation'
);

select is(
  (
    select count(*)::integer
    from public.rolbezettingen
    where id = '89040000-0000-4000-8000-000000000001'
      and status = 'actief'
  ),
  1,
  'setup: rollback testdata contains Milan active role occupancy'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '89020000-0000-4000-8000-000000000001'
      and profiel_id = app_private.current_profiel_id()
      and status = 'geaccepteerd'
  ),
  1,
  'positive composition RLS: Sam sees his own accepted participation as personal relation'
);

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '89020000-0000-4000-8000-000000000002'
      and profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition RLS: Milan participation is not a Sam personal relation'
);

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where id = '89050000-0000-4000-8000-000000000001'
      and ontvangend_profiel_id = app_private.current_profiel_id()
      and status = 'open'
  ),
  1,
  'positive composition RLS: Sam sees his own open moment proposal as attention'
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where id = '89080000-0000-4000-8000-000000000001'
      and profiel_id = app_private.current_profiel_id()
      and status = 'actief'
  ),
  1,
  'positive composition RLS: Sam sees his own active task assignee relation'
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where id = '89080000-0000-4000-8000-000000000002'
      and profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition RLS: Milan task assignee relation is not a Sam personal task'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89010000-0000-4000-8000-000000000003'
  ),
  0,
  'negative composition RLS: Milan role moment is not visible to Sam through a role relation'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89090000-0000-4000-8000-000000000001'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
      and status in ('nieuw', 'actie_nodig')
  ),
  1,
  'positive composition RLS: Sam sees profile-targeted attention'
);

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '89100000-0000-4000-8000-000000000001'
      and aangemaakt_vanuit_profiel_id = app_private.current_profiel_id()
      and status in ('nieuw', 'actie_nodig', 'in_behandeling')
  ),
  1,
  'positive composition RLS: Sam sees his own support question as attention'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89090000-0000-4000-8000-000000000002'
  ),
  1,
  'context RLS: Sam can see a Bewoners group signal through group context'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89090000-0000-4000-8000-000000000002'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition rule: group context alone is not profile-targeted Mijn dag attention'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89010000-0000-4000-8000-000000000003'
  ),
  1,
  'positive composition RLS: Milan role occupancy gives access to the linked moment context'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '89020000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam accepted participation'
);

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where id = '89050000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam moment proposal'
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where id = '89080000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam task assignee relation'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89090000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam profile-targeted signal'
);

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '89100000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam support attention'
);

reset role;

select * from finish();

rollback;
