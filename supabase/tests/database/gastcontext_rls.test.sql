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
) values (
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
set auth_user_id = '90000000-0000-4000-8000-000000000005'
where email = 'gijs.gast@example.test';

select is(
  (
    select count(*)::integer
    from public.personen p
    join public.profielen pr on pr.persoon_id = p.id
    where p.email = 'gijs.gast@example.test'
      and p.systeemrol = 'gast'
      and pr.id = '10000000-0000-4000-8000-000000000005'
      and pr.zichtbaar_voor_gasten = true
  ),
  1,
  'local reset keeps Gijs as the leading guest profile'
);

select is(
  (
    select count(*)::integer
    from public.groepslidmaatschappen
    where groep_id = '20000000-0000-4000-8000-000000000004'
      and profiel_id = '10000000-0000-4000-8000-000000000005'
      and status = 'actief'
  ),
  1,
  'local reset keeps Gijs in the Gasten group'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.momenten'::regclass
  ),
  true,
  'momenten has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'momenten'
      and policyname = 'momenten_select_can_view'
  ),
  1,
  'momenten select policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '47000000-0000-4000-8000-000000000005'
  ),
  1,
  'positive RLS: Gijs can see the explicit guest-access moment'
);

select is(
  (
    select count(*)::integer
    from public.deelnames
    where id = '48200000-0000-4000-8000-000000000004'
  ),
  1,
  'positive RLS: Gijs can see his own guest participation'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '47000000-0000-4000-8000-000000000002'
  ),
  0,
  'negative RLS: Gijs cannot see a Bewoners-only planning item'
);

select is(
  (
    select count(*)::integer
    from public.documenten
    where id = '60000000-0000-4000-8000-000000000002'
  ),
  0,
  'negative RLS: Gijs cannot see the internal Medewerkers document'
);

reset role;

select * from finish();

rollback;
