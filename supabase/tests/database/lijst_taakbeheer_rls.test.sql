begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(53);

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
  groep_inactief uuid := '89320000-0000-4000-8000-000000000090';
begin
  select id
    into bas_persoon
  from public.personen
  where lower(email) = 'bas.beheerder@example.test'
  limit 1;

  if bas_persoon is null then
    raise exception 'Missing Bas Beheerder test person.';
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
    '4B Inactieve testgroep',
    'Rollback-testgroep voor negatieve lijstbeheerinput.',
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
    where entiteit_type = 'lijst'
      and status = 'actief'
  ) > 0,
  true,
  'setup: active list category exists'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.lijsten'::regclass
  ),
  true,
  'lijsten has row level security enabled'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.taken'::regclass
  ),
  true,
  'taken has row level security enabled'
);

select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.taakuitvoerders'::regclass
  ),
  true,
  'taakuitvoerders has row level security enabled'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lijsten'
      and policyname in (
        'lijsten_insert_systeembeheerder',
        'lijsten_update_systeembeheerder'
      )
  ),
  2,
  'lijstbeheer insert and update policies are present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'taken'
      and policyname in (
        'taken_insert_systeembeheerder',
        'taken_update_systeembeheerder'
      )
  ),
  2,
  'taakbeheer insert and update policies are present'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'maak_groep_lijst',
        'wijzig_groep_lijst',
        'archiveer_groep_lijst',
        'maak_lijst_taak',
        'wijzig_lijst_taak',
        'archiveer_lijst_taak'
      )
  ),
  6,
  'lijst- en taakbeheer RPCs are present'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.maak_groep_lijst(uuid, uuid, text, text, uuid)',
    'execute'
  ),
  true,
  'authenticated can execute maak_groep_lijst'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.maak_lijst_taak(uuid, text, text, integer, timestamptz)',
    'execute'
  ),
  true,
  'authenticated can execute maak_lijst_taak'
);

select is(
  has_function_privilege(
    'anon',
    'public.maak_groep_lijst(uuid, uuid, text, text, uuid)',
    'execute'
  ),
  false,
  'anon cannot execute maak_groep_lijst'
);

select is(
  has_function_privilege(
    'anon',
    'public.maak_lijst_taak(uuid, text, text, integer, timestamptz)',
    'execute'
  ),
  false,
  'anon cannot execute maak_lijst_taak'
);

select is(
  (
    select count(*)::integer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'maak_groep_lijst',
        'wijzig_groep_lijst',
        'archiveer_groep_lijst',
        'maak_lijst_taak',
        'wijzig_lijst_taak',
        'archiveer_lijst_taak'
      )
      and p.prosecdef = false
  ),
  6,
  'lijst- en taakbeheer RPCs are security invoker'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select status::text
    from public.maak_groep_lijst(
      '20000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000004',
      '4B gekoppelde bewonerslijst',
      'Rollback-test voor groepseigen lijstbeheer.',
      '40000000-0000-4000-8000-000000000002'
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: Bas can create a group-owned list'
);

select is(
  (
    select count(*)::integer
    from public.lijsten
    where titel = '4B gekoppelde bewonerslijst'
      and eigenaar_groep_id = '20000000-0000-4000-8000-000000000002'
      and eigenaar_profiel_id is null
      and gekoppeld_moment_id = '40000000-0000-4000-8000-000000000002'
      and gekoppeld_doel_id is null
      and status = 'open'
      and created_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'create result: group owner, no profile owner, no goal link and controlled actor'
);

select is(
  (
    select count(*)::integer
    from public.lijst_groepen lg
    join public.lijsten l on l.id = lg.lijst_id
    where l.titel = '4B gekoppelde bewonerslijst'
      and lg.groep_id = l.eigenaar_groep_id
  ),
  1,
  'create result: primary lijst_groepen owner link is created'
);

select is(
  (
    select status::text
    from public.maak_lijst_taak(
      (
        select id
        from public.lijsten
        where titel = '4B gekoppelde bewonerslijst'
        limit 1
      ),
      '4B archieftaak',
      'Rollback-testtaak die straks wordt gearchiveerd.',
      1,
      '2026-06-24 09:00:00+02'
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: Bas can create a task in a managed group list'
);

select is(
  (
    select count(*)::integer
    from public.taken t
    join public.lijsten l on l.id = t.lijst_id
    where t.titel = '4B archieftaak'
      and l.titel = '4B gekoppelde bewonerslijst'
      and t.status = 'open'
      and t.sort_order = 1
      and t.created_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'task create result: list link, status, ordering and actor are controlled'
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders tu
    join public.taken t on t.id = tu.taak_id
    where t.titel = '4B archieftaak'
  ),
  0,
  'task create result: no task assignee row is created'
);

select is(
  (
    select status::text
    from public.wijzig_groep_lijst(
      (
        select id
        from public.lijsten
        where titel = '4B gekoppelde bewonerslijst'
        limit 1
      ),
      '30000000-0000-4000-8000-000000000004',
      '4B gekoppelde bewonerslijst gewijzigd',
      'Bijgewerkt door Bas.',
      null,
      'bezig'
    )
    limit 1
  ),
  'bezig',
  'positive RPC/RLS: Bas can update a managed group list'
);

select is(
  (
    select count(*)::integer
    from public.lijsten
    where titel = '4B gekoppelde bewonerslijst gewijzigd'
      and gekoppeld_moment_id is null
      and updated_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'list update result: actor is controlled and optional moment link can be cleared'
);

select is(
  (
    select status::text
    from public.wijzig_lijst_taak(
      (
        select id
        from public.taken
        where titel = '4B archieftaak'
        limit 1
      ),
      '4B archieftaak gewijzigd',
      'Bijgewerkt door Bas.',
      2,
      '2026-06-24 10:00:00+02',
      'afgerond'
    )
    limit 1
  ),
  'afgerond',
  'positive RPC/RLS: Bas can update a managed task'
);

select is(
  (
    select count(*)::integer
    from public.taken
    where titel = '4B archieftaak gewijzigd'
      and status = 'afgerond'
      and sort_order = 2
      and afgerond_at is not null
      and updated_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'task update result: status, completion timestamp and actor are controlled'
);

select is(
  (
    select status::text
    from public.archiveer_lijst_taak(
      (
        select id
        from public.taken
        where titel = '4B archieftaak gewijzigd'
        limit 1
      )
    )
    limit 1
  ),
  'vervallen',
  'positive RPC/RLS: Bas can archive a managed task'
);

select is(
  (
    select count(*)::integer
    from public.taken t
    left join public.taakuitvoerders tu on tu.taak_id = t.id
    where t.titel = '4B archieftaak gewijzigd'
      and t.status = 'vervallen'
      and t.archived_at is not null
      and t.archived_by_persoon_id = app_private.current_persoon_id()
      and tu.id is null
  ),
  1,
  'task archive result: archive fields are controlled and no assignee is added'
);

select is(
  (
    select status::text
    from public.archiveer_groep_lijst(
      (
        select id
        from public.lijsten
        where titel = '4B gekoppelde bewonerslijst gewijzigd'
        limit 1
      )
    )
    limit 1
  ),
  'gearchiveerd',
  'positive RPC/RLS: Bas can archive a managed group list'
);

select is(
  (
    select count(*)::integer
    from public.lijsten
    where titel = '4B gekoppelde bewonerslijst gewijzigd'
      and status = 'gearchiveerd'
      and archived_at is not null
      and archived_by_persoon_id = app_private.current_persoon_id()
  ),
  1,
  'list archive result: archive fields are controlled'
);

select is(
  (
    select status::text
    from public.maak_groep_lijst(
      '20000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000004',
      '4B actieve bewonerslijst',
      'Actieve rollback-testlijst voor lees- en claimgrenzen.',
      '40000000-0000-4000-8000-000000000002'
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: Bas can create an active list for read tests'
);

select set_config(
  'samzo_test.fase4b_active_lijst_id',
  (
    select id::text
    from public.lijsten
    where titel = '4B actieve bewonerslijst'
    limit 1
  ),
  true
);

select is(
  (
    select count(*)::integer
    from public.lijsten
    where id = current_setting('samzo_test.fase4b_active_lijst_id')::uuid
      and eigenaar_groep_id = '20000000-0000-4000-8000-000000000002'
      and eigenaar_profiel_id is null
      and gekoppeld_doel_id is null
  ),
  1,
  'active list result: active beheer list stays group-owned without goal link'
);

select is(
  (
    select status::text
    from public.maak_lijst_taak(
      current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
      '4B actieve bewonertaak',
      'Zichtbare taak die Sam zelf mag claimen.',
      1,
      '2026-06-25 09:00:00+02'
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: Bas can create an active task for claim tests'
);

select set_config(
  'samzo_test.fase4b_claim_taak_id',
  (
    select id::text
    from public.taken
    where titel = '4B actieve bewonertaak'
    limit 1
  ),
  true
);

select is(
  (
    select status::text
    from public.maak_lijst_taak(
      current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
      '4B beheer zonder uitvoerder',
      'Taak die niet namens Sam mag worden toegewezen.',
      2,
      '2026-06-25 10:00:00+02'
    )
    limit 1
  ),
  'open',
  'positive RPC/RLS: Bas can create a second active task without assignee'
);

select set_config(
  'samzo_test.fase4b_unassigned_taak_id',
  (
    select id::text
    from public.taken
    where titel = '4B beheer zonder uitvoerder'
    limit 1
  ),
  true
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where taak_id in (
      current_setting('samzo_test.fase4b_claim_taak_id')::uuid,
      current_setting('samzo_test.fase4b_unassigned_taak_id')::uuid
    )
  ),
  0,
  'active task result: beheer-created tasks start without assignees'
);

select throws_ok(
  $$select * from public.maak_groep_lijst(
    '89320000-0000-4000-8000-000000000090',
    '30000000-0000-4000-8000-000000000004',
    '4B inactieve groep',
    null,
    null
  )$$,
  '42501',
  'Groepslijst vereist een actieve groep.',
  'negative input: inactive group is refused'
);

select throws_ok(
  $$select * from public.maak_groep_lijst(
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000006',
    '4B verkeerde categorie',
    null,
    null
  )$$,
  '22023',
  'Groepslijst vereist een actieve lijstcategorie.',
  'negative input: non-list category is refused'
);

select throws_ok(
  $$select * from public.maak_groep_lijst(
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000004',
    '   ',
    null,
    null
  )$$,
  '22023',
  'Lijsttitel is verplicht.',
  'negative input: empty list title is refused'
);

select throws_ok(
  $$select * from public.maak_lijst_taak(
    current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
    '   ',
    null,
    3,
    null
  )$$,
  '22023',
  'Taaktitel is verplicht.',
  'negative input: empty task title is refused'
);

select throws_ok(
  $$select * from public.wijzig_groep_lijst(
    current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
    '30000000-0000-4000-8000-000000000004',
    '4B status niet via bewerken',
    null,
    null,
    'gearchiveerd'
  )$$,
  '22023',
  'Deze lijststatus is niet toegestaan via bewerken.',
  'negative input: archive status is refused through edit'
);

select throws_ok(
  $$select * from public.wijzig_lijst_taak(
    current_setting('samzo_test.fase4b_unassigned_taak_id')::uuid,
    '4B taakstatus niet via beheer',
    null,
    2,
    null,
    'geaccepteerd'
  )$$,
  '22023',
  'Deze taakstatus is niet toegestaan via beheer.',
  'negative input: personal task status is refused through beheer edit'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.lijsten
    where id = current_setting('samzo_test.fase4b_active_lijst_id')::uuid
  ),
  1,
  'positive RLS: Sam can read the active Bewoners list'
);

select is(
  (
    select count(*)::integer
    from public.taken
    where id = current_setting('samzo_test.fase4b_claim_taak_id')::uuid
  ),
  1,
  'positive RLS: Sam can read the active Bewoners task'
);

select is(
  (
    select count(*)::integer
    from public.lijsten
    where titel = '4B gekoppelde bewonerslijst gewijzigd'
  ),
  0,
  'negative RLS: Sam cannot read archived group lists'
);

select is(
  (
    select count(*)::integer
    from public.taken
    where titel = '4B archieftaak gewijzigd'
  ),
  0,
  'negative RLS: Sam cannot read archived tasks'
);

select throws_ok(
  $$select * from public.maak_groep_lijst(
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000004',
    '4B Sam mag niet maken',
    null,
    null
  )$$,
  '42501',
  'Alleen systeembeheerder mag lijsten beheren.',
  'negative actor: Sam cannot create group lists'
);

select throws_ok(
  $$select * from public.maak_lijst_taak(
    current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
    '4B Sam mag geen taak maken',
    null,
    3,
    null
  )$$,
  '42501',
  'Alleen systeembeheerder mag taken beheren.',
  'negative actor: Sam cannot create tasks'
);

select lives_ok(
  $$insert into public.taakuitvoerders (
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    updated_at
  ) values (
    current_setting('samzo_test.fase4b_claim_taak_id')::uuid,
    app_private.current_profiel_id(),
    'actief',
    app_private.current_persoon_id(),
    now(),
    now()
  )$$,
  'positive regression: Sam can claim his own visible beheer-created task'
);

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where taak_id = current_setting('samzo_test.fase4b_claim_taak_id')::uuid
      and profiel_id = app_private.current_profiel_id()
      and status = 'actief'
  ),
  1,
  'claim regression result: Sam has exactly one active own task assignee row'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select throws_ok(
  $$select * from public.maak_groep_lijst(
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000004',
    '4B Milan mag niet maken',
    null,
    null
  )$$,
  '42501',
  'Alleen systeembeheerder mag lijsten beheren.',
  'negative actor: Milan cannot create group lists'
);

select throws_ok(
  $$select * from public.wijzig_groep_lijst(
    current_setting('samzo_test.fase4b_active_lijst_id')::uuid,
    '30000000-0000-4000-8000-000000000004',
    '4B Milan mag niet wijzigen',
    null,
    null,
    'open'
  )$$,
  '42501',
  'Alleen systeembeheerder mag lijsten beheren.',
  'negative actor: Milan cannot edit group lists through profile access'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.lijsten
    where id = current_setting('samzo_test.fase4b_active_lijst_id')::uuid
  ),
  0,
  'negative RLS: Gijs cannot read the internal Bewoners list'
);

select is(
  (
    select count(*)::integer
    from public.taken
    where id = current_setting('samzo_test.fase4b_claim_taak_id')::uuid
  ),
  0,
  'negative RLS: Gijs cannot read the internal Bewoners task'
);

select throws_ok(
  $$insert into public.taakuitvoerders (
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    updated_at
  ) values (
    current_setting('samzo_test.fase4b_unassigned_taak_id')::uuid,
    '10000000-0000-4000-8000-000000000004',
    'actief',
    app_private.current_persoon_id(),
    now(),
    now()
  )$$,
  '42501',
  'new row violates row-level security policy for table "taakuitvoerders"',
  'negative RLS: Gijs cannot create a task assignee row for Sam'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.taakuitvoerders
    where taak_id = current_setting('samzo_test.fase4b_unassigned_taak_id')::uuid
  ),
  0,
  'no side effect: rejected assignment attempt leaves task without assignee'
);

select * from finish();

rollback;
