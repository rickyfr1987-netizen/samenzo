begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

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

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where id in (
      '45500000-0000-4000-8000-000000000001',
      '45500000-0000-4000-8000-000000000003'
    )
      and status = 'open'
  ),
  2,
  'local reset keeps the open proposal seed rows used for RLS tests'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.voorstellen'::regclass
  ),
  true,
  'voorstellen has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'voorstellen'
      and policyname = 'voorstellen_select_betrokken_of_beheer'
  ),
  1,
  'voorstellen select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'voorstellen'
      and policyname = 'voorstellen_update_status_bij_ontvanger'
  ),
  1,
  'voorstellen status update policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where id = '45500000-0000-4000-8000-000000000001'
  ),
  1,
  'positive RLS: Sam can see his own open proposal'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where id = '45500000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam proposal as an unrelated profile'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.beantwoord_moment_voorstel(
    '45500000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    'accept'
  )$$,
  '42501',
  'Voorstelactie is alleen toegestaan voor het ontvangende profiel.',
  'negative RPC/RLS: Bas cannot answer Sam proposal on behalf of Sam'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select voorstel_status::text
    from public.beantwoord_moment_voorstel(
      '45500000-0000-4000-8000-000000000003',
      '10000000-0000-4000-8000-000000000004',
      'reject'
    )
    limit 1
  ),
  'geweigerd',
  'positive RPC/RLS: Sam can reject his own open proposal'
);

reset role;

select * from finish();

rollback;
