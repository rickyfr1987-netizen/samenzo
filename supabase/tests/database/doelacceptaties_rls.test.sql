begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

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
      '2G Sam persoonlijk voorgesteld doel',
      'Rollback-testdoel voor eigen doelacceptatie.',
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
      '2G Medewerkers verborgen doel',
      'Rollback-testdoel dat Sam niet via doel-RLS mag zien.',
      cat_doel,
      null,
      groep_medewerkers,
      'onder_de_aandacht',
      '2026-06-12 00:00:00+02',
      '2026-07-12 00:00:00+02',
      bas_persoon
    );

  insert into public.doelacceptaties (
    id,
    doel_id,
    profiel_id,
    status
  ) values
    (
      '89420000-0000-4000-8000-000000000001',
      '89410000-0000-4000-8000-000000000001',
      sam_profiel,
      'voorgesteld'
    ),
    (
      '89420000-0000-4000-8000-000000000002',
      '89410000-0000-4000-8000-000000000002',
      sam_profiel,
      'voorgesteld'
    ),
    (
      '89420000-0000-4000-8000-000000000003',
      '89410000-0000-4000-8000-000000000001',
      sam_profiel,
      'voorgesteld'
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
      and policyname = 'doelacceptaties_update_eigen_voorgesteld'
  ),
  1,
  'doelacceptaties update policy is present'
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

update public.doelacceptaties
set
  status = 'geaccepteerd',
  geaccepteerd_at = now(),
  updated_at = now()
where id = '89420000-0000-4000-8000-000000000001';

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000001'
      and status = 'geaccepteerd'
      and geaccepteerd_at is not null
      and geweigerd_at is null
      and later_bekijken_at is null
  ),
  1,
  'positive RLS: Sam can accept his own proposed goal acceptance'
);

update public.doelacceptaties
set
  status = 'geweigerd',
  geweigerd_at = now(),
  updated_at = now()
where id = '89420000-0000-4000-8000-000000000001';

select is(
  (
    select status::text
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000001'
  ),
  'geaccepteerd',
  'negative RLS: Sam cannot re-answer an already accepted goal acceptance'
);

select throws_ok(
  $$
    insert into public.doelacceptaties (
      id,
      doel_id,
      profiel_id,
      status
    ) values (
      '89420000-0000-4000-8000-000000000004',
      '89410000-0000-4000-8000-000000000001',
      app_private.current_profiel_id(),
      'voorgesteld'
    )
  $$,
  '42501',
  'negative RLS: Sam cannot create goal acceptances without an explicit proposal flow'
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

update public.doelacceptaties
set
  status = 'geweigerd',
  geweigerd_at = now(),
  updated_at = now()
where id = '89420000-0000-4000-8000-000000000003';

reset role;

select is(
  (
    select status::text
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000003'
  ),
  'voorgesteld',
  'negative RLS: Gijs cannot answer Sams goal acceptance'
);

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

update public.doelacceptaties
set
  status = 'geaccepteerd',
  geaccepteerd_at = now(),
  updated_at = now()
where id = '89420000-0000-4000-8000-000000000003';

reset role;

select is(
  (
    select status::text
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000003'
  ),
  'voorgesteld',
  'negative RLS: Bas cannot accept Sams goal acceptance'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

update public.doelacceptaties
set
  status = 'later_bekijken',
  later_bekijken_at = now(),
  updated_at = now()
where id = '89420000-0000-4000-8000-000000000003';

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89420000-0000-4000-8000-000000000003'
      and status = 'later_bekijken'
      and later_bekijken_at is not null
  ),
  1,
  'positive RLS: Sam can mark his own proposed goal acceptance as later bekijken'
);

reset role;

select * from finish();

rollback;
