begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

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
    '90000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'sanne.support@example.test',
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
set auth_user_id = '90000000-0000-4000-8000-000000000002'
where email = 'sanne.support@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000004'
where email = 'sam.bewoner@example.test';

update public.personen
set auth_user_id = '90000000-0000-4000-8000-000000000005'
where email = 'gijs.gast@example.test';

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '70000000-0000-4000-8000-000000000001'
      and aangemaakt_door_persoon_id = '00000000-0000-4000-8000-000000000004'
      and aangemaakt_vanuit_profiel_id = '10000000-0000-4000-8000-000000000004'
      and toegewezen_aan_persoon_id = '00000000-0000-4000-8000-000000000002'
      and status = 'nieuw'
  ),
  1,
  'local reset keeps the Sam support question seed row used for RLS tests'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.supportvragen'::regclass
  ),
  true,
  'supportvragen has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supportvragen'
      and policyname = 'supportvragen_select_context_of_support'
  ),
  1,
  'supportvragen context/support select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supportvragen'
      and policyname = 'supportvragen_insert_eigen_profiel_nieuw'
  ),
  1,
  'supportvragen own-profile insert policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supportvragen'
      and policyname = 'supportvragen_update_support_and_requester'
  ),
  1,
  'supportvragen support/requester update policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'supportvragen'
      and policyname = 'supportvragen_update_requester_close_own_with_response'
  ),
  1,
  'supportvragen requester close-after-response update policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  1,
  'positive RLS: Sam can see his own support question'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  1,
  'positive RLS: Sanne can see a support question as system support'
);

select is(
  (
    with updated as (
      update public.supportvragen
      set status = 'in_behandeling',
        behandeld_door_persoon_id = '00000000-0000-4000-8000-000000000002',
        updated_at = now()
      where id = '70000000-0000-4000-8000-000000000001'
      returning id
    )
    select count(*)::integer
    from updated
  ),
  1,
  'positive RLS: Sanne can move a support question into treatment'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam support question as an unrelated guest profile'
);

select is(
  (
    with updated as (
      update public.supportvragen
      set status = 'gesloten',
        gesloten_at = now(),
        updated_at = now()
      where id = '70000000-0000-4000-8000-000000000001'
      returning id
    )
    select count(*)::integer
    from updated
  ),
  0,
  'negative RLS: Gijs cannot update Sam support question as an unrelated guest profile'
);

reset role;

select * from finish();

rollback;
