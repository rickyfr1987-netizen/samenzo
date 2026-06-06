begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(44);

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
  cat_moment uuid;
  cat_doel uuid;
  groep_bewoners uuid;
  groep_gasten uuid;
  groep_inactief uuid := '89310000-0000-4000-8000-000000000090';
begin
  select id
    into bas_persoon
  from public.personen
  where lower(email) = 'bas.beheerder@example.test'
  limit 1;

  select id
    into cat_moment
  from public.categorieen
  where entiteit_type = 'moment'
    and status = 'actief'
  order by naam
  limit 1;

  select id
    into cat_doel
  from public.categorieen
  where entiteit_type = 'doel'
    and status = 'actief'
  order by naam
  limit 1;

  select id
    into groep_bewoners
  from public.groepen
  where naam = 'Bewoners'
  limit 1;

  select id
    into groep_gasten
  from public.groepen
  where naam = 'Gasten'
  limit 1;

  if bas_persoon is null then
    raise exception 'Missing Bas Beheerder test person.';
  end if;

  if cat_moment is null then
    raise exception 'Missing active moment category.';
  end if;

  if cat_doel is null then
    raise exception 'Missing active goal category.';
  end if;

  if groep_bewoners is null then
    raise exception 'Missing Bewoners group.';
  end if;

  if groep_gasten is null then
    raise exception 'Missing Gasten group.';
  end if;

  insert into public.groepen (
    id,
    naam,
    beschrijving,
    zichtbaarheid,
    groepstype,
    status,
    created_by_persoon_id
  ) values (
    groep_inactief,
    '3C Inactieve testgroep',
    'Rollback-testgroep voor negatieve momentbeheerinput.',
    'zichtbaar',
    'testgroep',
    'gearchiveerd',
    bas_persoon
  )
  on conflict (id) do nothing;
end $$;

select is(
  (
    select count(*)::integer
    from public.personen
    where email in (
      'bas.beheerder@example.test',
      'milan.medewerker@example.test',
      'sam.bewoner@example.test',
      'gijs.gast@example.test'
    )
      and auth_user_id is not null
  ),
  4,
  'setup: local users are linked to Auth ids'
);

select is(
  (
    select count(*)::integer
    from public.groepen
    where naam in ('Bewoners', 'Gasten')
      and status = 'actief'
  ),
  2,
  'setup: active Bewoners and Gasten groups exist'
);

select is(
  (
    select count(*)::integer
    from public.categorieen
    where entiteit_type = 'moment'
      and status = 'actief'
  ) > 0,
  true,
  'setup: active moment category exists'
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
    select relrowsecurity
    from pg_class
    where oid = 'public.moment_groepen'::regclass
  ),
  true,
  'moment_groepen has row level security enabled'
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

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'maak_groep_moment',
        'wijzig_groep_moment',
        'archiveer_groep_moment'
      )
  ),
  3,
  'planning momentbeheer RPCs are present'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.maak_groep_moment(uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, integer, boolean, boolean)',
    'execute'
  ),
  true,
  'authenticated can execute maak_groep_moment'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.wijzig_groep_moment(uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, integer, boolean, boolean, public.moment_status)',
    'execute'
  ),
  true,
  'authenticated can execute wijzig_groep_moment'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.archiveer_groep_moment(uuid)',
    'execute'
  ),
  true,
  'authenticated can execute archiveer_groep_moment'
);

select is(
  has_function_privilege(
    'anon',
    'public.maak_groep_moment(uuid, uuid, text, text, timestamptz, timestamptz, boolean, text, integer, boolean, boolean)',
    'execute'
  ),
  false,
  'anon cannot execute maak_groep_moment'
);

select is(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'maak_groep_moment'
    limit 1
  ),
  false,
  'maak_groep_moment is security invoker'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select status::text
    from public.maak_groep_moment(
      '20000000-0000-4000-8000-000000000002',
      (
        select id
        from public.categorieen
        where entiteit_type = 'moment'
          and status = 'actief'
        order by naam
        limit 1
      ),
      '3C bewonersmoment',
      'Rollback-test voor groepgericht momentbeheer.',
      '2026-06-20 10:00:00+02',
      '2026-06-20 11:00:00+02',
      false,
      'Woonkamer',
      12,
      false,
      false
    )
    limit 1
  ),
  'gepland',
  'positive RPC/RLS: Bas can create a planned group moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where titel = '3C bewonersmoment'
      and eigenaar_groep_id = '20000000-0000-4000-8000-000000000002'
      and eigenaar_profiel_id is null
      and status = 'gepland'
      and created_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'create result: group owner, no profile owner, status and actor are controlled'
);

select is(
  (
    select count(*)::integer
    from public.moment_groepen mg
    join public.momenten m on m.id = mg.moment_id
    where m.titel = '3C bewonersmoment'
      and mg.groep_id = m.eigenaar_groep_id
      and mg.context_type = 'eigenaar'
  ),
  1,
  'create result: primary moment_groepen owner link is created'
);

select is(
  (
    select count(*)::integer
    from public.deelnames d
    join public.momenten m on m.id = d.moment_id
    where m.titel = '3C bewonersmoment'
  ),
  0,
  'create result: no participations are created'
);

select is(
  (
    select count(*)::integer
    from public.momentrollen mr
    join public.momenten m on m.id = mr.moment_id
    where m.titel = '3C bewonersmoment'
  ),
  0,
  'create result: no moment roles are created'
);

select is(
  (
    select count(*)::integer
    from public.rolbezettingen rb
    join public.momentrollen mr on mr.id = rb.momentrol_id
    join public.momenten m on m.id = mr.moment_id
    where m.titel = '3C bewonersmoment'
  ),
  0,
  'create result: no role occupancies are created'
);

select is(
  (
    select status::text
    from public.maak_groep_moment(
      '20000000-0000-4000-8000-000000000002',
      (
        select id
        from public.categorieen
        where entiteit_type = 'moment'
          and status = 'actief'
        order by naam
        limit 1
      ),
      '3C open bewonersmoment',
      null,
      '2026-06-20 12:00:00+02',
      '2026-06-20 13:00:00+02',
      false,
      null,
      null,
      true,
      false
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: open registration creates open status'
);

select is(
  (
    select status::text
    from public.wijzig_groep_moment(
      (
        select id
        from public.momenten
        where titel = '3C bewonersmoment'
        limit 1
      ),
      (
        select id
        from public.categorieen
        where entiteit_type = 'moment'
          and status = 'actief'
        order by naam
        limit 1
      ),
      '3C bewonersmoment gewijzigd',
      'Bijgewerkt door Bas.',
      '2026-06-20 10:30:00+02',
      '2026-06-20 11:30:00+02',
      false,
      'Huiskamer',
      14,
      false,
      false,
      'gewijzigd'
    )
    limit 1
  ),
  'gewijzigd',
  'positive RPC/RLS: Bas can update a group moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where titel = '3C bewonersmoment gewijzigd'
      and updated_by_persoon_id = app_private.current_persoon_id()
      and eigenaar_profiel_id is null
      and eigenaar_groep_id = '20000000-0000-4000-8000-000000000002'
  ),
  1,
  'update result: actor is controlled and owner is unchanged'
);

select is(
  (
    select status::text
    from public.archiveer_groep_moment(
      (
        select id
        from public.momenten
        where titel = '3C bewonersmoment gewijzigd'
        limit 1
      )
    )
    limit 1
  ),
  'gearchiveerd',
  'positive RPC/RLS: Bas can archive a group moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where titel = '3C bewonersmoment gewijzigd'
      and status = 'gearchiveerd'
      and archived_at is not null
      and archived_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'archive result: archive fields are controlled'
);

select is(
  (
    select status::text
    from public.maak_groep_moment(
      '20000000-0000-4000-8000-000000000004',
      (
        select id
        from public.categorieen
        where entiteit_type = 'moment'
          and status = 'actief'
        order by naam
        limit 1
      ),
      '3C gastmoment',
      'Rollback-test voor expliciete gasttoegang.',
      '2026-06-21 10:00:00+02',
      '2026-06-21 11:00:00+02',
      false,
      'Ontvangst',
      null,
      false,
      true
    )
    limit 1
  ),
  'gepland',
  'positive RPC/RLS: Bas can create guest-access only for Gasten group'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C intern gastlek',
    null,
    '2026-06-21 12:00:00+02',
    '2026-06-21 13:00:00+02',
    false,
    null,
    null,
    false,
    true
  )$$,
  '42501',
  'Gasttoegang is alleen toegestaan voor de gastgroep.',
  'negative RPC/RLS: internal groups cannot be opened with guest access'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '   ',
    null,
    '2026-06-21 14:00:00+02',
    '2026-06-21 15:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '22023',
  'Momenttitel is verplicht.',
  'negative input: empty title is rejected'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C tijd fout',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 14:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '22023',
  'Eindtijd moet na starttijd liggen.',
  'negative input: invalid time range is rejected'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C capaciteit fout',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 16:00:00+02',
    false,
    null,
    -1,
    false,
    false
  )$$,
  '22023',
  'Capaciteit mag niet negatief zijn.',
  'negative input: negative capacity is rejected'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '89310000-0000-4000-8000-000000000090',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C inactieve groep',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 16:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '42501',
  'Planningmoment vereist een actieve groep.',
  'negative input: archived group is rejected'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'doel'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C verkeerde categorie',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 16:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '22023',
  'Planningmoment vereist een actieve momentcategorie.',
  'negative input: non-moment category is rejected'
);

select throws_ok(
  $$select * from public.wijzig_groep_moment(
    (
      select id
      from public.momenten
      where titel = '3C open bewonersmoment'
      limit 1
    ),
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C status fout',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 16:00:00+02',
    false,
    null,
    null,
    false,
    false,
    'vol'
  )$$,
  '22023',
  'Deze momentstatus is niet toegestaan via bewerken.',
  'negative input: manual full status is rejected'
);

select throws_ok(
  $$select * from public.wijzig_groep_moment(
    (
      select id
      from public.momenten
      where titel = '3C open bewonersmoment'
      limit 1
    ),
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C open fout',
    null,
    '2026-06-21 15:00:00+02',
    '2026-06-21 16:00:00+02',
    false,
    null,
    null,
    false,
    false,
    'open'
  )$$,
  '22023',
  'Status open vereist open inschrijving.',
  'negative input: open status requires open registration'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.momenten
    where titel = '3C open bewonersmoment'
  ),
  1,
  'positive RLS: Sam can read the non-archived Bewoners group moment'
);

select is(
  (
    select count(*)::integer
    from public.momenten
    where titel = '3C bewonersmoment gewijzigd'
  ),
  0,
  'negative RLS: Sam cannot read the archived group moment'
);

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C Sam mag niet maken',
    null,
    '2026-06-22 10:00:00+02',
    '2026-06-22 11:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '42501',
  'Alleen systeembeheerder mag planningmomenten beheren.',
  'negative actor: Sam cannot create group moments'
);

select throws_ok(
  $$select * from public.wijzig_groep_moment(
    (
      select id
      from public.momenten
      where titel = '3C open bewonersmoment'
      limit 1
    ),
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C Sam mag niet wijzigen',
    null,
    '2026-06-22 10:00:00+02',
    '2026-06-22 11:00:00+02',
    false,
    null,
    null,
    false,
    false,
    'gepland'
  )$$,
  '42501',
  'Alleen systeembeheerder mag planningmomenten beheren.',
  'negative actor: Sam cannot update group moments'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_groep_moment(
    '20000000-0000-4000-8000-000000000002',
    (
      select id
      from public.categorieen
      where entiteit_type = 'moment'
        and status = 'actief'
      order by naam
      limit 1
    ),
    '3C Milan mag niet maken',
    null,
    '2026-06-22 10:00:00+02',
    '2026-06-22 11:00:00+02',
    false,
    null,
    null,
    false,
    false
  )$$,
  '42501',
  'Alleen systeembeheerder mag planningmomenten beheren.',
  'negative actor: Milan cannot create group moments'
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
    where titel = '3C gastmoment'
      and gasttoegang = true
  ),
  1,
  'positive RLS: Gijs can read explicit guest-access moment in guest group'
);

select throws_ok(
  $$select * from public.archiveer_groep_moment(
    (
      select id
      from public.momenten
      where titel = '3C gastmoment'
      limit 1
    )
  )$$,
  '42501',
  'Alleen systeembeheerder mag planningmomenten beheren.',
  'negative actor: Gijs cannot archive group moments'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.voorstellen
    where titel like '3C%'
  ),
  0,
  'no side effect: no proposals are created'
);

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where titel like '3C%'
  ),
  0,
  'no side effect: no timeline messages are created'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where titel like '3C%'
  ),
  0,
  'no side effect: no signals are created'
);

select is(
  (
    select count(*)::integer
    from public.taken
    where titel like '3C%'
  ),
  0,
  'no side effect: no tasks are created'
);

select is(
  (
    select count(*)::integer
    from public.supportvragen
    where onderwerp like '3C%'
  ),
  0,
  'no side effect: no support requests are created'
);

select * from finish();

rollback;
