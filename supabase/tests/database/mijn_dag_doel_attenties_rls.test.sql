begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

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
      '89510000-0000-4000-8000-000000000001',
      '2H Sam voorgesteld doel',
      'Rollback-testdoel voor een read-only doel-attentie.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 08:00:00+02',
      null,
      bas_persoon
    ),
    (
      '89510000-0000-4000-8000-000000000002',
      '2H Medewerkers verborgen doel',
      'Rollback-testdoel dat Sam niet via doel-RLS mag zien.',
      cat_doel,
      null,
      groep_medewerkers,
      'onder_de_aandacht',
      '2026-06-12 08:05:00+02',
      null,
      bas_persoon
    ),
    (
      '89510000-0000-4000-8000-000000000003',
      '2H Sam later bekijken doel',
      'Rollback-testdoel dat als later bekijken aandacht mag blijven.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 08:10:00+02',
      null,
      bas_persoon
    ),
    (
      '89510000-0000-4000-8000-000000000004',
      '2H Sam geweigerd doel',
      'Rollback-testdoel dat niet als actieve aandacht hoort te verschijnen.',
      cat_doel,
      sam_profiel,
      null,
      'onder_de_aandacht',
      '2026-06-12 08:15:00+02',
      null,
      bas_persoon
    ),
    (
      '89510000-0000-4000-8000-000000000005',
      '2H Sam geaccepteerd doel',
      'Rollback-testdoel dat later een persoonlijk doelitem kan worden.',
      cat_doel,
      sam_profiel,
      null,
      'actief',
      '2026-06-12 08:20:00+02',
      null,
      bas_persoon
    );

  insert into public.doelacceptaties (
    id,
    doel_id,
    profiel_id,
    status,
    geaccepteerd_at,
    geweigerd_at,
    later_bekijken_at,
    created_at,
    updated_at
  ) values
    (
      '89520000-0000-4000-8000-000000000001',
      '89510000-0000-4000-8000-000000000001',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null,
      '2026-06-12 08:00:00+02',
      null
    ),
    (
      '89520000-0000-4000-8000-000000000002',
      '89510000-0000-4000-8000-000000000002',
      sam_profiel,
      'voorgesteld',
      null,
      null,
      null,
      '2026-06-12 08:05:00+02',
      null
    ),
    (
      '89520000-0000-4000-8000-000000000003',
      '89510000-0000-4000-8000-000000000003',
      sam_profiel,
      'later_bekijken',
      null,
      null,
      '2026-06-12 08:10:00+02',
      '2026-06-11 08:10:00+02',
      '2026-06-12 08:10:00+02'
    ),
    (
      '89520000-0000-4000-8000-000000000004',
      '89510000-0000-4000-8000-000000000004',
      sam_profiel,
      'geweigerd',
      null,
      '2026-06-12 08:15:00+02',
      null,
      '2026-06-12 08:15:00+02',
      '2026-06-12 08:15:00+02'
    ),
    (
      '89520000-0000-4000-8000-000000000005',
      '89510000-0000-4000-8000-000000000005',
      sam_profiel,
      'geaccepteerd',
      '2026-06-12 08:20:00+02',
      null,
      null,
      '2026-06-12 08:20:00+02',
      '2026-06-12 08:20:00+02'
    );
end $$;

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doelacceptaties'
      and policyname = 'doelacceptaties_select_eigen_profiel'
  ),
  1,
  'policy: doelacceptaties select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'doelen'
      and policyname = 'doelen_select_can_view_doel'
  ),
  1,
  'policy: doelen select policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89520000-0000-4000-8000-000000000001'
      and profiel_id = app_private.current_profiel_id()
      and status = 'voorgesteld'
  ),
  1,
  'positive RLS: Sam sees his own proposed goal acceptance'
);

select is(
  (
    select count(*)::integer
    from public.doelen
    where id = '89510000-0000-4000-8000-000000000001'
  ),
  1,
  'positive RLS: Sam sees the goal linked by the safe acceptance'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.id = '89520000-0000-4000-8000-000000000001'
      and da.profiel_id = app_private.current_profiel_id()
      and da.status in ('voorgesteld', 'later_bekijken')
  ),
  1,
  'positive composition RLS: safe acceptance can become a read-only goal attention'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties
    where id = '89520000-0000-4000-8000-000000000002'
      and profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative RLS: acceptance to an invisible linked goal is not visible to Sam'
);

select is(
  (
    select count(*)::integer
    from public.doelen
    where id = '89510000-0000-4000-8000-000000000002'
  ),
  0,
  'negative RLS: hidden linked goal content remains closed'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.id = '89520000-0000-4000-8000-000000000002'
      and da.profiel_id = app_private.current_profiel_id()
      and da.status in ('voorgesteld', 'later_bekijken')
  ),
  0,
  'negative composition RLS: hidden linked goal cannot become a safe goal card'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.profiel_id = app_private.current_profiel_id()
      and da.status = 'voorgesteld'
  ),
  1,
  'status filter: voorgesteld is active goal attention'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.profiel_id = app_private.current_profiel_id()
      and da.status = 'later_bekijken'
  ),
  1,
  'status filter: later_bekijken remains active goal attention'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.profiel_id = app_private.current_profiel_id()
      and da.status = 'geweigerd'
  ),
  1,
  'boundary RLS: Sam can still read his refused acceptance row'
);

select is(
  (
    select count(*)::integer
    from public.doelacceptaties da
    join public.doelen d on d.id = da.doel_id
    where da.profiel_id = app_private.current_profiel_id()
      and da.status in ('voorgesteld', 'later_bekijken')
  ),
  2,
  'status filter: only proposed and later bekijken are active read-only goal attentions'
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
    where id in (
      '89520000-0000-4000-8000-000000000001',
      '89520000-0000-4000-8000-000000000003'
    )
  ),
  0,
  'negative RLS: Gijs cannot see Sams goal acceptances as Mijn dag attention'
);

reset role;

select * from finish();

rollback;
