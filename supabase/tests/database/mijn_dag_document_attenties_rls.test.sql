begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

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
  bas_profiel uuid;
  sam_profiel uuid;
  gijs_profiel uuid;
  groep_bewoners uuid;
  groep_medewerkers uuid;
  cat_document uuid;
begin
  select p.id, pr.id
    into bas_persoon, bas_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'bas.beheerder@example.test'
  limit 1;

  select pr.id
    into sam_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'sam.bewoner@example.test'
  limit 1;

  select pr.id
    into gijs_profiel
  from public.personen p
  join public.profielen pr on pr.persoon_id = p.id
  where lower(p.email) = 'gijs.gast@example.test'
  limit 1;

  select id
    into groep_bewoners
  from public.groepen
  where naam = 'Bewoners'
  limit 1;

  select id
    into groep_medewerkers
  from public.groepen
  where naam = 'Medewerkers'
  limit 1;

  select id
    into cat_document
  from public.categorieen
  where entiteit_type = 'document'
    and status = 'actief'
  order by naam
  limit 1;

  if bas_persoon is null or bas_profiel is null then
    raise exception 'Missing Bas Beheerder test profile.';
  end if;

  if sam_profiel is null then
    raise exception 'Missing Sam Bewoner test profile.';
  end if;

  if gijs_profiel is null then
    raise exception 'Missing Gijs Gast test profile.';
  end if;

  if groep_bewoners is null or groep_medewerkers is null then
    raise exception 'Missing required groups for document attention tests.';
  end if;

  if cat_document is null then
    raise exception 'Missing document category for document attention tests.';
  end if;

  insert into public.documenten (
    id,
    titel,
    samenvatting,
    inhoud,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    status,
    gepubliceerd_at,
    created_by_persoon_id
  ) values
    (
      '89310000-0000-4000-8000-000000000001',
      '2F Sam zichtbaar document',
      'Rollback-testdocument dat Sam via document-RLS mag zien.',
      'Fictieve inhoud voor document-attentie zonder dossierinformatie.',
      cat_document,
      sam_profiel,
      null,
      'gepubliceerd',
      '2026-06-01 09:00:00+02',
      bas_persoon
    ),
    (
      '89310000-0000-4000-8000-000000000002',
      '2F Medewerkers intern document',
      'Rollback-testdocument dat Sam niet via document-RLS mag zien.',
      'Fictieve interne medewerkersinformatie zonder echte gegevens.',
      cat_document,
      null,
      groep_medewerkers,
      'gepubliceerd',
      '2026-06-01 09:05:00+02',
      bas_persoon
    ),
    (
      '89310000-0000-4000-8000-000000000003',
      '2F Bewoners groepsdocument',
      'Rollback-testdocument voor groepscontextcontrole.',
      'Fictieve groepsinformatie voor bewoners.',
      cat_document,
      null,
      groep_bewoners,
      'gepubliceerd',
      '2026-06-01 09:10:00+02',
      bas_persoon
    );

  insert into public.tijdlijnberichten (
    id,
    type,
    status,
    titel,
    inhoud,
    afzender_persoon_id,
    afzender_profiel_id,
    gericht_aan_profiel_id,
    gericht_aan_groep_id,
    gekoppeld_type,
    gekoppeld_id,
    urgent,
    zichtbaar_vanaf_at,
    created_at
  ) values
    (
      '89320000-0000-4000-8000-000000000001',
      'document_onder_de_aandacht',
      'actie_nodig',
      '2F zichtbaar document voor Sam',
      'Profielgerichte document-attentie met zichtbaar document.',
      bas_persoon,
      bas_profiel,
      sam_profiel,
      null,
      'document',
      '89310000-0000-4000-8000-000000000001',
      false,
      '2026-06-12 08:00:00+02',
      '2026-06-12 08:00:00+02'
    ),
    (
      '89320000-0000-4000-8000-000000000002',
      'document_onder_de_aandacht',
      'actie_nodig',
      '2F verboden document voor Sam',
      'Profielgerichte attentie waarvan het document zelf niet zichtbaar is.',
      bas_persoon,
      bas_profiel,
      sam_profiel,
      null,
      'document',
      '89310000-0000-4000-8000-000000000002',
      false,
      '2026-06-12 08:05:00+02',
      '2026-06-12 08:05:00+02'
    ),
    (
      '89320000-0000-4000-8000-000000000003',
      'document_onder_de_aandacht',
      'actie_nodig',
      '2F groepsdocument Bewoners',
      'Groepscontext alleen is geen persoonlijke Mijn dag-documentattentie.',
      bas_persoon,
      bas_profiel,
      null,
      groep_bewoners,
      'document',
      '89310000-0000-4000-8000-000000000003',
      false,
      '2026-06-12 08:10:00+02',
      '2026-06-12 08:10:00+02'
    );

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gericht_aan_groep_id,
    gekoppeld_type,
    gekoppeld_id,
    created_by_persoon_id,
    created_at
  ) values
    (
      '89330000-0000-4000-8000-000000000001',
      'aandacht_nodig',
      'nieuw',
      '2F signaal zichtbaar document Sam',
      'Signaal als profielgerichte document-attentie.',
      sam_profiel,
      null,
      'document',
      '89310000-0000-4000-8000-000000000001',
      bas_persoon,
      '2026-06-12 08:15:00+02'
    ),
    (
      '89330000-0000-4000-8000-000000000002',
      'aandacht_nodig',
      'nieuw',
      '2F groepssignaal document Bewoners',
      'Groepssignaal is zichtbaar via groep maar geen persoonlijke Mijn dag-documentattentie.',
      null,
      groep_bewoners,
      'document',
      '89310000-0000-4000-8000-000000000003',
      bas_persoon,
      '2026-06-12 08:20:00+02'
    );
end $$;

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'documenten'
      and policyname = 'documenten_select_context_gepubliceerd_of_beheer'
  ),
  1,
  'policy: documenten select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tijdlijnberichten'
      and policyname = 'tijdlijnberichten_select_ontvanger_afzender_of_support'
  ),
  1,
  'policy: tijdlijnberichten select policy is present'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'public'
      and tablename = 'signalen'
      and policyname = 'signalen_select_ontvanger_of_support'
  ),
  1,
  'policy: signalen select policy is present'
);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where id = '89320000-0000-4000-8000-000000000001'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
      and gekoppeld_type = 'document'
  ),
  1,
  'positive RLS: Sam sees the profile-targeted timeline document attention'
);

select is(
  (
    select count(*)::integer
    from public.documenten
    where id = '89310000-0000-4000-8000-000000000001'
  ),
  1,
  'positive RLS: Sam sees the document linked by the safe attention'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89330000-0000-4000-8000-000000000001'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
      and gekoppeld_type = 'document'
  ),
  1,
  'positive RLS: Sam sees a profile-targeted signal document attention'
);

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where id = '89320000-0000-4000-8000-000000000002'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
      and gekoppeld_type = 'document'
  ),
  1,
  'boundary RLS: Sam can see a profile attention that points at an inaccessible document'
);

select is(
  (
    select count(*)::integer
    from public.documenten
    where id = '89310000-0000-4000-8000-000000000002'
  ),
  0,
  'negative RLS: Sam cannot see the Medewerkers document linked by that attention'
);

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten tb
    join public.documenten d on d.id = tb.gekoppeld_id
    where tb.id = '89320000-0000-4000-8000-000000000002'
      and tb.gekoppeld_type = 'document'
      and tb.gericht_aan_profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition RLS: joining visible attention to invisible document yields no safe document card'
);

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where id = '89320000-0000-4000-8000-000000000003'
  ),
  1,
  'context RLS: Sam can see a Bewoners group timeline document attention'
);

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where id = '89320000-0000-4000-8000-000000000003'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition rule: group timeline context alone is not a personal document attention'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89330000-0000-4000-8000-000000000002'
  ),
  1,
  'context RLS: Sam can see a Bewoners group signal document attention'
);

select is(
  (
    select count(*)::integer
    from public.signalen
    where id = '89330000-0000-4000-8000-000000000002'
      and gericht_aan_profiel_id = app_private.current_profiel_id()
  ),
  0,
  'negative composition rule: group signal context alone is not a personal document attention'
);

reset role;

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
set local row_security = on;

select is(
  (
    select count(*)::integer
    from public.tijdlijnberichten
    where id = '89320000-0000-4000-8000-000000000001'
  ),
  0,
  'negative RLS: Gijs cannot see Sams profile-targeted timeline document attention'
);

reset role;

select * from finish();

rollback;
