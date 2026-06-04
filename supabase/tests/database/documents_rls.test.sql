begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

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
  )
on conflict (id) do nothing;

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000003'
where email = 'milan.medewerker@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000004'
where email = 'sam.bewoner@example.test';

select is(
  (
    select count(*)::integer
    from public.personen
    where email in (
      'bas.beheerder@example.test',
      'sanne.support@example.test',
      'milan.medewerker@example.test',
      'sam.bewoner@example.test',
      'gijs.gast@example.test'
    )
  ),
  5,
  'local reset keeps the five leading Fase 1 seed people'
);

select is(
  (
    select count(*)::integer
    from public.personen
    where email in (
      'noor.bewoner@example.test',
      'lotte.familie@example.test',
      'vera.vrijwilliger@example.test'
    )
  ),
  0,
  'legacy eight-profile seed set is not loaded automatically'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.documenten'::regclass
  ),
  true,
  'documenten has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documenten'
      and policyname = 'documenten_select_context_gepubliceerd_of_beheer'
  ),
  1,
  'documenten select policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.documenten
    where id = '60000000-0000-4000-8000-000000000002'
  ),
  1,
  'positive RLS: Milan can see the published Medewerkers document'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.documenten
    where id = '60000000-0000-4000-8000-000000000002'
  ),
  0,
  'negative RLS: Sam cannot see the Medewerkers document'
);

reset role;

select * from finish();

rollback;
