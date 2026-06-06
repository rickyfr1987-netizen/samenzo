begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

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

  insert into public.profieltoegangen (
    persoon_id,
    profiel_id,
    toegangstype,
    status,
    verleend_door_persoon_id,
    verleend_at,
    updated_at
  )
  values
    (
      gijs_persoon,
      sam_profiel,
      'begeleiding',
      'actief',
      bas_persoon,
      now(),
      now()
    ),
    (
      milan_persoon,
      sam_profiel,
      'medewerker',
      'actief',
      bas_persoon,
      now(),
      now()
    )
  on conflict (persoon_id, profiel_id) where status = 'actief' do update
    set
      toegangstype = excluded.toegangstype,
      status = excluded.status,
      verleend_door_persoon_id = excluded.verleend_door_persoon_id,
      verleend_at = excluded.verleend_at,
      updated_at = excluded.updated_at,
      ingetrokken_at = null,
      ingetrokken_door_persoon_id = null;
end $$;

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.momenten'::regclass
  ),
  true,
  'schema: momenten has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'momenten'
      and column_name = 'eigenaar_profiel_id'
  ),
  1,
  'schema: eigenaar_profiel_id column exists on momenten'
);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'momenten'
      and column_name = 'eigenaar_groep_id'
  ),
  1,
  'schema: eigenaar_groep_id column exists on momenten'
);

select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'momenten'
      and column_name = 'categorie_id'
  ),
  'NO',
  'schema: categorie is required for personal moments'
);

select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'momenten'
      and column_name = 'start_at'
  ),
  'YES',
  'schema: start_at is nullable in table, so RPC must validate active usage'
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
  'policy: momenten select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'momenten'
      and policyname = 'momenten_insert_eigen_profiel_of_systeembeheerder'
  ),
  1,
  'policy: momenten insert policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'maak_persoonlijk_moment'
  ),
  1,
  'RPC: own-personal-moment creation function is present'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.maak_persoonlijk_moment(uuid, text, uuid, timestamptz, timestamptz, text, text, boolean)',
    'execute'
  ),
  true,
  'RPC: authenticated role can execute the personal-moment creation function'
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
  'positive RLS: Sam sees his own owner-profile personal moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000003'
  ),
  0,
  'negative RLS: Sam does not see his own archived owner-profile moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where id = '89210000-0000-4000-8000-000000000004'
  ),
  0,
  'negative RLS: Sam does not see Gijs guest-access owner-profile moment without guest context'
);

create temporary table if not exists t_eigen_moment_result (
  moment_id uuid,
  eigenaar_profiel_id uuid,
  eigenaar_groep_id uuid,
  titel text,
  start_at timestamptz,
  eind_at timestamptz,
  status text
);

truncate table t_eigen_moment_result;

insert into t_eigen_moment_result
select * from public.maak_persoonlijk_moment(
  (
    select pr.id
    from public.personen p
    join public.profielen pr on pr.persoon_id = p.id
    where lower(p.email) = 'sam.bewoner@example.test'
    limit 1
  ),
  '2O-b eigen persoonlijk moment',
  (
    select id
    from public.categorieen
    where entiteit_type = 'moment'
      and status = 'actief'
    order by naam
    limit 1
  ),
  '2026-06-20 08:30:00+02'::timestamptz,
  null::timestamptz,
  null::text,
  null::text,
  false
);

select is(
  (
    select count(*)::integer
    from t_eigen_moment_result
  ),
  1,
  'positive RPC: Sam can create his own personal moment'
);

select is(
  (
    select status
    from t_eigen_moment_result
  ),
  'gepland',
  'positive RPC: created personal moment gets status gepland'
);

select is(
  (
    select count(*)::integer
    from public.momenten m
    join t_eigen_moment_result r
      on r.moment_id = m.id
    where m.eigenaar_profiel_id = app_private.current_profiel_id()
      and m.eigenaar_groep_id is null
      and m.inschrijving_open = false
  ),
  1,
  'positive RPC: created moment belongs to Sam, has no owner group and is not open for inscription'
);

select is(
  (
    select count(*)::integer
    from public.deelnames d
    join t_eigen_moment_result r
      on r.moment_id = d.moment_id
  ),
  0,
  'positive setup: created personal moment has no participation'
);

select is(
  (
    select count(*)::integer
    from public.momenten m
    join t_eigen_moment_result r
      on r.moment_id = m.id
    where m.eigenaar_profiel_id = app_private.current_profiel_id()
  ),
  1,
  'positive RLS: Sam can see the newly created own personal moment'
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
    where id = (select moment_id from t_eigen_moment_result limit 1)
      and eigenaar_profiel_id = (
        select pr.id
        from public.personen p
        join public.profielen pr on pr.persoon_id = p.id
        where lower(p.email) = 'sam.bewoner@example.test'
        limit 1
      )
  ),
  0,
  'negative RLS: Gijs cannot see Sam-owned personal moment created by RPC'
);

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Gijs-naam mag niet',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '2026-06-20 10:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '42501',
  'Persoonlijk moment kan alleen voor het eigen actieve profiel worden aangemaakt.',
  'negative RPC/RLS: Gijs cannot create a personal moment on behalf of Sam'
);

reset role;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Milan mag niet via medewerker-context',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '2026-06-20 11:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '42501',
  'Persoonlijk moment kan alleen voor het eigen actieve profiel worden aangemaakt.',
  'negative RPC/RLS: Milan (medewerker/profieltoegang) cannot create for Sam'
);

reset role;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Gijs profieltoegang mag niet',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '2026-06-20 12:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '42501',
  'Persoonlijk moment kan alleen voor het eigen actieve profiel worden aangemaakt.',
  'negative RPC/RLS: profile-access user cannot create on Sam via same profile access'
);

reset role;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Bas mag niet aanmaken namens Sam',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '2026-06-20 13:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '42501',
  'Persoonlijk moment kan alleen voor het eigen actieve profiel worden aangemaakt.',
  'negative RPC/RLS: Bas (systeembeheerder) cannot create for Sam'
);

reset role;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    '',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '2026-06-20 14:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '22023',
  'Titel is verplicht.',
  'negative RPC/RLS: title is required'
);

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Samen met starttijd ontbreekt',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    null::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '22023',
  'Starttijd is verplicht.',
  'negative RPC/RLS: start_at is required'
);

select throws_ok(
  $$select * from public.maak_persoonlijk_moment(
    (
      select pr.id
      from public.personen p
      join public.profielen pr on pr.persoon_id = p.id
      where lower(p.email) = 'sam.bewoner@example.test'
      limit 1
    ),
    'Categorie ontbreekt',
    null::uuid,
    '2026-06-20 15:00:00+02'::timestamptz,
    null::timestamptz,
    null::text,
    null::text,
    false
  )$$,
  '22023',
  'Persoonlijk moment vereist een doelprofiel en categorie.',
  'negative RPC/RLS: category is required'
);

reset role;

select * from finish();

rollback;
