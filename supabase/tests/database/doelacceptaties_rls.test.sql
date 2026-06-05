begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(29);

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
  sam_profiel uuid;
  groep_medewerkers uuid;
  cat_doel uuid;
begin
  select id
    into bas_persoon
  from public.personen
  where lower(email) = 'bas.beheerder@example.test'
  limit 1;

  select pr.id
    into sam_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sam.bewoner@example.test'
  limit 1;

  select id
    into groep_medewerkers
  from public.groepen
  where naam = 'Medewerkers'
  limit 1;

  select id
    into cat_doel
  from public.categorieen
  where entiteit_type = 'doel'
    and status = 'actief'
  order by naam
  limit 1;

  if bas_persoon is null then
    raise exception 'Missing Bas Beheerder test person.';
  end if;

  if sam_profiel is null then
    raise exception 'Missing Sam Bewoner test profile.';
  end if;

  if groep_medewerkers is null then
    raise exception 'Missing Medewerkers group.';
  end if;

  if cat_doel is null then
    raise exception 'Missing doel category.';
  end if;

  insert into public.doelen (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    status,
    start_at,
    eind_at,
    created_by_persoon_id
  ) values
    (
      '89410000-0000-4000-8000-000000000001',
      '2L Sam voorgesteld doel accepteren',
      'Rollback-testdoel voor acceptatie via RPC.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000002',
      '2L Medewerkers verborgen doel',
      'Rollback-testdoel dat Sam niet via doel-RLS mag zien.',
      cat_doel,
      null,
      groep_medewerkers,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000003',
      '2L Sam beschermd doel',
      'Rollback-testdoel voor negatieve profielcontext.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000004',
      '2L Sam later bekijken',
      'Rollback-testdoel voor later bekijken via RPC.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000005',
      '2L Sam voorgesteld doel weigeren',
      'Rollback-testdoel voor weigeren via RPC.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000006',
      '2L Sam later alsnog accepteren',
      'Rollback-testdoel voor later bekijken naar accepteren.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000007',
      '2L Sam later alsnog weigeren',
      'Rollback-testdoel voor later bekijken naar weigeren.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000008',
      '2L Sam reeds geaccepteerd',
      'Rollback-testdoel voor herbeantwoorden na acceptatie.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000009',
      '2L Sam reeds geweigerd',
      'Rollback-testdoel voor herbeantwoorden na weigering.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    ),
    (
      '89410000-0000-4000-8000-000000000010',
      '2L Sam verlopen doelacceptatie',
      'Rollback-testdoel voor verlopen acceptatie.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    );

  insert into public.doelacceptaties (
    id,
    doel_id,
    profiel_id,
    status,
    geaccepteerd_at,
    geweigerd_at,
    later_bekijken_at
  ) values
    (
      '89420000-0000-4000-8000-000000000001',
      '89410000-0000-4000-8000-000000000001',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000002',
      '89410000-0000-4000-8000-000000000002',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000003',
      '89410000-0000-4000-8000-000000000003',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000004',
      '89410000-0000-4000-8000-000000000004',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000005',
      '89410000-0000-4000-8000-000000000005',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000006',
      '89410000-0000-4000-8000-000000000006',
      sam_profiel,
      'later_bekijken',
      null,
      null,
      now() - interval '1 hour'
    ),
    (
      '89420000-0000-4000-8000-000000000007',
      '89410000-0000-4000-8000-000000000007',
      sam_profiel,
      'later_bekijken',
      null,
      null,
      now() - interval '1 hour'
    ),
    (
      '89420000-0000-4000-8000-000000000008',
      '89410000-0000-4000-8000-000000000008',
      sam_profiel,
      'geaccepteerd',
      now() - interval '1 hour',
      null,
      null
    ),
    (
      '89420000-0000-4000-8000-000000000009',
      '89410000-0000-4000-8000-000000000009',
      sam_profiel,
      'geweigerd',
      null,
      now() - interval '1 hour',
      null
    ),
    (
      '89420000-0000-4000-8000-000000000010',
      '89410000-0000-4000-8000-000000000010',
      sam_profiel,
      'verlopen',
      null,
      null,
      null
    );
end $$;

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.doelacceptaties'::regclass
  ),
  true,
  'doelacceptaties has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doelacceptaties'
      and policyname = 'doelacceptaties_select_eigen_profiel'
  ),
  1,
  'doelacceptaties select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doelacceptaties'
      and policyname = 'doelacceptaties_update_eigen_actief'
  ),
  1,
  'doelacceptaties active update policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'beantwoord_doelacceptatie'
  ),
  1,
  'doelacceptatie action RPC is present'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.beantwoord_doelacceptatie(uuid, uuid, text)',
    'execute'
  ),
  true,
  'authenticated can execute the doelacceptatie action RPC'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000001'
      and profiel_id = app_private.current_profiel_id()
      and status = 'voorgesteld'
  ),
  1,
  'positive RLS: Sam sees his own proposed goal acceptance when the goal is visible'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000002'
      and profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative RLS: Sam does not see own acceptance when the linked goal is not visible'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.id = '89420000-0000-4000-8000-000000000002'
      and da.profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative RLS: doelacceptatie does not open linked goal content'
);

select is(
  (
    select doelacceptatie_status::text
    from public.beantwoord_doelacceptatie(
      '89420000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000004',
      'accept'
    )
    limit 1
  ),
  'geaccepteerd',
  'positive RPC/RLS: Sam can accept his own proposed goal acceptance'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000001'
      and status = 'geaccepteerd'
      and geaccepteerd_at is not null
      and geweigerd_at is null
      and later_bekijken_at is null
      and updated_at is not null
  ),
  1,
  'timestamp rule: accepted goal acceptance has only accepted timestamp and updated_at'
);

select is(
  (
    select doelacceptatie_status::text
    from public.beantwoord_doelacceptatie(
      '89420000-0000-4000-8000-000000000005',
      '10000000-0000-4000-8000-000000000004',
      'reject'
    )
    limit 1
  ),
  'geweigerd',
  'positive RPC/RLS: Sam can reject his own proposed goal acceptance'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000005'
      and status = 'geweigerd'
      and geaccepteerd_at is null
      and geweigerd_at is not null
      and later_bekijken_at is null
      and updated_at is not null
  ),
  1,
  'timestamp rule: rejected goal acceptance has only rejected timestamp and updated_at'
);

select is(
  (
    select doelacceptatie_status::text
    from public.beantwoord_doelacceptatie(
      '89420000-0000-4000-8000-000000000004',
      '10000000-0000-4000-8000-000000000004',
      'later'
    )
    limit 1
  ),
  'later_bekijken',
  'positive RPC/RLS: Sam can mark his own proposed goal acceptance as later bekijken'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000004'
      and status = 'later_bekijken'
      and geaccepteerd_at is null
      and geweigerd_at is null
      and later_bekijken_at is not null
      and updated_at is not null
  ),
  1,
  'timestamp rule: later bekijken has only later timestamp and updated_at'
);

select is(
  (
    select doelacceptatie_status::text
    from public.beantwoord_doelacceptatie(
      '89420000-0000-4000-8000-000000000006',
      '10000000-0000-4000-8000-000000000004',
      'accept'
    )
    limit 1
  ),
  'geaccepteerd',
  'positive RPC/RLS: Sam can accept a later bekijken goal acceptance'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000006'
      and status = 'geaccepteerd'
      and geaccepteerd_at is not null
      and geweigerd_at is null
      and later_bekijken_at is null
  ),
  1,
  'timestamp rule: accepting later bekijken clears the later timestamp intentionally'
);

select is(
  (
    select doelacceptatie_status::text
    from public.beantwoord_doelacceptatie(
      '89420000-0000-4000-8000-000000000007',
      '10000000-0000-4000-8000-000000000004',
      'reject'
    )
    limit 1
  ),
  'geweigerd',
  'positive RPC/RLS: Sam can reject a later bekijken goal acceptance'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'archive'
  )$$,
  '22023',
  'Onbekende doelacceptatieactie.',
  'negative RPC/RLS: unknown goal acceptance action is rejected'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'later'
  )$$,
  '23514',
  'Doelacceptatie staat al op later bekijken.',
  'negative RPC/RLS: later bekijken cannot be repeated'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000004',
    'reject'
  )$$,
  '23514',
  'Doelacceptatie is niet meer open.',
  'negative RPC/RLS: Sam cannot re-answer an already accepted goal acceptance'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '23514',
  'Doelacceptatie is niet meer open.',
  'negative RPC/RLS: Sam cannot re-answer an already rejected goal acceptance'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '23514',
  'Doelacceptatie is niet meer open.',
  'negative RPC/RLS: Sam cannot answer an expired goal acceptance'
);

select throws_ok(
  $$
    insert into public.doelacceptaties (
      id,
      doel_id,
      profiel_id,
      status
    ) values (
      '89420000-0000-4000-8000-000000000011',
      '89410000-0000-4000-8000-000000000003',
      app_private.current_profiel_id(),
      'voorgesteld'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "doelacceptaties"',
  'negative RLS: Sam cannot create goal acceptances without an explicit proposal flow'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '42501',
  'Doelacceptatie is niet zichtbaar voor dit profiel.',
  'negative RPC/RLS: hidden linked goal cannot be answered through the action flow'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000003'
  ),
  0,
  'negative RLS: Gijs cannot see Sams goal acceptance'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '42501',
  'Doelacceptatieactie is alleen toegestaan voor het eigen profiel.',
  'negative RPC/RLS: Gijs cannot answer Sams goal acceptance'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000003'
  ),
  0,
  'negative RLS: Bas cannot see Sams goal acceptance through beheercontext'
);

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '42501',
  'Doelacceptatieactie is alleen toegestaan voor het eigen profiel.',
  'negative RPC/RLS: Bas cannot accept Sams goal acceptance'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.beantwoord_doelacceptatie(
    '89420000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '42501',
  'Doelacceptatieactie is alleen toegestaan voor het eigen profiel.',
  'negative RPC/RLS: Milan cannot answer Sams goal acceptance as medewerker'
);

reset role;

select * from finish();

rollback;
