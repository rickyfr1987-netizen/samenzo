begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

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
  sam_persoon uuid;
  sam_profiel uuid;
  milan_persoon uuid;
  milan_profiel uuid;
  gijs_persoon uuid;
  gijs_profiel uuid;
  cat_moment uuid;
begin
  select p.id
    into bas_persoon
  from public.personen p
  where lower(p.email) = 'bas.beheerder@example.test'
  limit 1;

  select p.id, pr.id
    into sam_persoon, sam_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sam.bewoner@example.test'
  limit 1;

  select p.id, pr.id
    into milan_persoon, milan_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'milan.medewerker@example.test'
  limit 1;

  select p.id, pr.id
    into gijs_persoon, gijs_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'gijs.gast@example.test'
  limit 1;

  select id
    into cat_moment
  from public.categorieen
  where entiteit_type = 'moment'
    and status = 'actief'
  order by naam
  limit 1;

  if bas_persoon is null then
    raise exception 'Missing Bas Beheerder test person.';
  end if;

  if sam_persoon is null or sam_profiel is null then
    raise exception 'Missing Sam Bewoner test profile.';
  end if;

  if milan_persoon is null or milan_profiel is null then
    raise exception 'Missing Milan Medewerker test profile.';
  end if;

  if gijs_persoon is null or gijs_profiel is null then
    raise exception 'Missing Gijs Gast test profile.';
  end if;

  if cat_moment is null then
    raise exception 'Missing moment category for personal moment tests.';
  end if;

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_by_persoon_id
  ) values
    (
      '89210000-0000-4000-8000-000000000001',
      '2E Sam persoonlijk moment',
      'Rollback-testdata voor eigenaar-profiel zonder deelname.',
      cat_moment,
      sam_profiel,
      '2026-06-11 09:00:00+02',
      '2026-06-11 09:30:00+02',
      'Kamer Sam',
      'open',
      false,
      false,
      '2026-06-01 08:00:00+02',
      sam_persoon
    ),
    (
      '89210000-0000-4000-8000-000000000002',
      '2E Milan persoonlijk moment',
      'Controle dat eigen Milan-moment eigen profielcontext blijft.',
      cat_moment,
      milan_profiel,
      '2026-06-11 10:00:00+02',
      '2026-06-11 10:30:00+02',
      'Teamkamer',
      'open',
      false,
      false,
      '2026-06-01 08:00:00+02',
      milan_persoon
    ),
    (
      '89210000-0000-4000-8000-000000000003',
      '2E Sam gearchiveerd persoonlijk moment',
      'Gearchiveerde eigenaar-profiel momenten vallen buiten actieve RLS-zichtbaarheid.',
      cat_moment,
      sam_profiel,
      '2026-06-11 11:00:00+02',
      '2026-06-11 11:30:00+02',
      'Kamer Sam',
      'gearchiveerd',
      false,
      false,
      '2026-06-01 08:00:00+02',
      sam_persoon
    ),
    (
      '89210000-0000-4000-8000-000000000004',
      '2E Gijs gast persoonlijk moment',
      'Gast-eigenaar ziet dit alleen omdat gasttoegang expliciet aan staat.',
      cat_moment,
      gijs_profiel,
      '2026-06-11 12:00:00+02',
      '2026-06-11 12:30:00+02',
      'Ontvangst',
      'open',
      false,
      true,
      '2026-06-01 08:00:00+02',
      gijs_persoon
    ),
    (
      '89210000-0000-4000-8000-000000000005',
      '2E Gijs niet-gasttoegankelijk persoonlijk moment',
      'Gast-eigenaar zonder gasttoegang blijft door guest-gate gesloten.',
      cat_moment,
      gijs_profiel,
      '2026-06-11 13:00:00+02',
      '2026-06-11 13:30:00+02',
      'Ontvangst',
      'open',
      false,
      false,
      '2026-06-01 08:00:00+02',
      gijs_persoon
    );
end $$;

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'momenten'
      and column_name = 'eigenaar_profiel_id'
  ),
  1,
  'schema: momenten has eigenaar_profiel_id for owner-profile personal moments'
);

select is(
  (
    select count(*)::integer
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'momenten'
      and indexname = 'momenten_eigenaar_profiel_idx'
  ),
  1,
  'schema: owner-profile moments have an eigenaar_profiel_id index'
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
  'policy: momenten select uses the central can_view_moment policy'
);

select is(
  (
    select count(*)::integer
    from public.deelnames
    where moment_id = '89210000-0000-4000-8000-000000000001'
  ),
  0,
  'setup: Sam personal moment has no participation relation'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000001'
      and eigenaar_profiel_id = app_private.current_profiel_id()
  ),
  1,
  'positive RLS: Sam sees his owner-profile personal moment without participation'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000003'
  ),
  0,
  'negative RLS: Sam does not see his archived owner-profile personal moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000004'
  ),
  0,
  'negative RLS: Sam does not see Gijs guest-access personal moment without profile access'
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
    where id = '89210000-0000-4000-8000-000000000002'
      and eigenaar_profiel_id = app_private.current_profiel_id()
  ),
  1,
  'positive RLS: Milan sees his own owner-profile personal moment'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sam owner-profile personal moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000004'
      and eigenaar_profiel_id = app_private.current_profiel_id()
      and gasttoegang = true
  ),
  1,
  'positive RLS: Gijs can see his own guest-access owner-profile personal moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000005'
      and eigenaar_profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative RLS: Gijs cannot see his own owner-profile moment when gasttoegang is false'
);

select is(
  (
    select count(*)::integer
    from public.deelnames
    where moment_id = '89210000-0000-4000-8000-000000000004'
  ),
  0,
  'setup: Gijs guest personal moment also works without participation relation'
);

reset role;

select * from finish();

rollback;
