begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

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
set auth_user_id = '90000000-0000-4000-8000-000000000003'
where email = 'milan.medewerker@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000004'
where email = 'sam.bewoner@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000005'
where email = 'gijs.gast@example.test';

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '48200000-0000-4000-8000-000000000007'
      and moment_id = '47000000-0000-4000-8000-000000000007'
      and profiel_id = '10000000-0000-4000-8000-000000000003'
      and status = 'geaccepteerd'
  ),
  1,
  'local reset keeps Milan participation used for note context'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.begeleidingsnotities'::regclass
  ),
  true,
  'begeleidingsnotities has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'begeleidingsnotities'
      and policyname = 'begeleidingsnotities_select_context_bound'
  ),
  1,
  'begeleidingsnotities context-bound select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'begeleidingsnotities'
      and policyname = 'begeleidingsnotities_insert_context_bound'
  ),
  1,
  'begeleidingsnotities context-bound insert policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select lives_ok(
  $$insert into public.begeleidingsnotities (
    id,
    inhoud,
    status,
    moment_id,
    betrokken_profiel_id,
    zichtbaar_voor_roltype,
    created_by_persoon_id
  ) values (
    '73000000-0000-4000-8000-000000000101',
    'Fictieve minimale RLS-testnotitie zonder echte persoonsgegevens.',
    'actief',
    '47000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000003',
    null,
    '00000000-0000-4000-8000-000000000003'
  )$$,
  'positive RLS: Milan can create a note in his allowed moment context'
);

select is(
  (
    select count(*)::integer
    from public.begeleidingsnotities
    where id = '73000000-0000-4000-8000-000000000101'
  ),
  1,
  'positive RLS: Milan can see the allowed guidance note'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.begeleidingsnotities
    where id = '73000000-0000-4000-8000-000000000101'
  ),
  0,
  'negative RLS: Sam cannot see the guidance note without note access'
);

select throws_ok(
  $$insert into public.begeleidingsnotities (
    id,
    inhoud,
    status,
    moment_id,
    betrokken_profiel_id,
    zichtbaar_voor_roltype,
    created_by_persoon_id
  ) values (
    '73000000-0000-4000-8000-000000000102',
    'Fictieve bewoner-notitie die RLS hoort te weigeren.',
    'actief',
    '47000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000003',
    null,
    '00000000-0000-4000-8000-000000000004'
  )$$,
  '42501',
  'new row violates row-level security policy for table "begeleidingsnotities"',
  'negative RLS: Sam cannot create a guidance note in Milan context'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.begeleidingsnotities
    where id = '73000000-0000-4000-8000-000000000101'
  ),
  0,
  'negative RLS: Gijs cannot see guidance notes as a guest'
);

reset role;

select * from finish();

rollback;
