-- Dev-only reset fixture for browser smoke data.
-- Run against a local Supabase database after the normal development seed.
-- Auth users are linked only when matching local auth.users rows already exist.

begin;

do $$
declare
  base_at constant timestamptz := '2026-06-06 08:00:00+02'::timestamptz;

  bas_persoon uuid;
  sanne_persoon uuid;
  milan_persoon uuid;
  sam_persoon uuid;
  gijs_persoon uuid;

  bas_profiel uuid;
  sanne_profiel uuid;
  milan_profiel uuid;
  sam_profiel uuid;
  gijs_profiel uuid;

  bewoners_groep uuid;
  medewerkers_groep uuid;
  gasten_groep uuid;

  moment_categorie uuid;
  lijst_categorie uuid;
  doel_categorie uuid;

  doel_uuid uuid := '8e2e9000-0000-4000-8000-000000000001'::uuid;
  doelacceptatie_uuid uuid := '8e2e9000-0000-4000-8000-000000000002'::uuid;
begin
  select id into bas_persoon from public.personen where email = 'bas.beheerder@example.test' limit 1;
  select id into sanne_persoon from public.personen where email = 'sanne.support@example.test' limit 1;
  select id into milan_persoon from public.personen where email = 'milan.medewerker@example.test' limit 1;
  select id into sam_persoon from public.personen where email = 'sam.bewoner@example.test' limit 1;
  select id into gijs_persoon from public.personen where email = 'gijs.gast@example.test' limit 1;

  select id into bas_profiel from public.profielen where persoon_id = bas_persoon limit 1;
  select id into sanne_profiel from public.profielen where persoon_id = sanne_persoon limit 1;
  select id into milan_profiel from public.profielen where persoon_id = milan_persoon limit 1;
  select id into sam_profiel from public.profielen where persoon_id = sam_persoon limit 1;
  select id into gijs_profiel from public.profielen where persoon_id = gijs_persoon limit 1;

  select id into bewoners_groep from public.groepen where naam = 'Bewoners' limit 1;
  select id into medewerkers_groep from public.groepen where naam = 'Medewerkers' limit 1;
  select id into gasten_groep from public.groepen where naam = 'Gasten' limit 1;

  select id
    into moment_categorie
    from public.categorieen
   where naam = 'Activiteit'
     and entiteit_type = 'moment'
   limit 1;

  select id
    into lijst_categorie
    from public.categorieen
   where naam = 'Praktische lijst'
     and entiteit_type = 'lijst'
   limit 1;

  select id
    into doel_categorie
    from public.categorieen
   where naam = 'Doel licht'
     and entiteit_type = 'doel'
   limit 1;

  if bas_persoon is null
     or sanne_persoon is null
     or milan_persoon is null
     or sam_persoon is null
     or gijs_persoon is null
     or bas_profiel is null
     or sanne_profiel is null
     or milan_profiel is null
     or sam_profiel is null
     or gijs_profiel is null
     or bewoners_groep is null
     or medewerkers_groep is null
     or gasten_groep is null
     or moment_categorie is null
    or doel_categorie is null then
    raise exception 'Missing required local seed data for e2e browser fixture';
  end if;

  update public.personen p
     set auth_user_id = au.id
    from auth.users au
   where lower(au.email) = lower(p.email)
     and lower(p.email) in (
       'bas.beheerder@example.test',
       'sanne.support@example.test',
       'milan.medewerker@example.test',
       'sam.bewoner@example.test',
       'gijs.gast@example.test'
     );

  delete from public.notificatiestatussen
   where tijdlijnbericht_id = '8e2e8100-0000-4000-8000-000000000001'::uuid;

  delete from public.supportvraag_reacties
   where supportvraag_id = '8e2e4000-0000-4000-8000-000000000001'::uuid;

  delete from public.tijdlijnberichten
   where id = '8e2e8100-0000-4000-8000-000000000001'::uuid
      or supportvraag_id = '8e2e4000-0000-4000-8000-000000000001'::uuid
      or signaal_id = '8e2e8000-0000-4000-8000-000000000001'::uuid
      or voorstel_id = '8e2e3000-0000-4000-8000-000000000001'::uuid;

  delete from public.signalen
   where id = '8e2e8000-0000-4000-8000-000000000001'::uuid;

  delete from public.doelacceptaties
   where id = doelacceptatie_uuid;

  delete from public.doelen
   where id = doel_uuid;

  delete from public.profieltoegangen
   where id = '8e2e9200-0000-4000-8000-000000000001'::uuid;

  delete from public.supportvragen
   where id = '8e2e4000-0000-4000-8000-000000000001'::uuid;

  delete from public.taakuitvoerders
   where id = '8e2e5200-0000-4000-8000-000000000001'::uuid
      or taak_id in (
        '8e2e5100-0000-4000-8000-000000000001'::uuid,
        '8e2e5100-0000-4000-8000-000000000002'::uuid
      );

  delete from public.taken
   where id in (
     '8e2e5100-0000-4000-8000-000000000001'::uuid,
     '8e2e5100-0000-4000-8000-000000000002'::uuid
   );

  delete from public.lijst_groepen
   where id in (
     '8e2e5300-0000-4000-8000-000000000001'::uuid,
     '8e2e5300-0000-4000-8000-000000000002'::uuid
   )
      or lijst_id = '8e2e5000-0000-4000-8000-000000000001'::uuid;

  delete from public.lijsten
   where id = '8e2e5000-0000-4000-8000-000000000001'::uuid;

  delete from public.rolbezettingen
   where id = '8e2e6200-0000-4000-8000-000000000001'::uuid
      or momentrol_id in (
        '8e2e6100-0000-4000-8000-000000000001'::uuid,
        '8e2e6100-0000-4000-8000-000000000002'::uuid
      );

  delete from public.momentrollen
   where id in (
     '8e2e6100-0000-4000-8000-000000000001'::uuid,
     '8e2e6100-0000-4000-8000-000000000002'::uuid
   );

  delete from public.deelnames
   where id in (
     '8e2e2000-0000-4000-8000-000000000001'::uuid,
     '8e2e7200-0000-4000-8000-000000000001'::uuid
   );

  delete from public.voorstellen
   where id = '8e2e3000-0000-4000-8000-000000000001'::uuid;

  delete from public.moment_groepen
   where id in (
     '8e2e1100-0000-4000-8000-000000000001'::uuid,
     '8e2e1100-0000-4000-8000-000000000002'::uuid,
     '8e2e1100-0000-4000-8000-000000000003'::uuid,
     '8e2e1100-0000-4000-8000-000000000004'::uuid
   )
      or moment_id in (
        '8e2e1000-0000-4000-8000-000000000001'::uuid,
        '8e2e6000-0000-4000-8000-000000000001'::uuid,
        '8e2e7000-0000-4000-8000-000000000001'::uuid,
        '8e2e7000-0000-4000-8000-000000000002'::uuid
      );

  delete from public.momenten
   where id in (
     '8e2e1000-0000-4000-8000-000000000001'::uuid,
     '8e2e6000-0000-4000-8000-000000000001'::uuid,
     '8e2e7000-0000-4000-8000-000000000001'::uuid,
     '8e2e7000-0000-4000-8000-000000000002'::uuid
   );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '8e2e1000-0000-4000-8000-000000000001'::uuid,
    'E2E voorstel koffieochtend',
    'Resetbare browserfixture voor een open voorstel aan Sam.',
    moment_categorie,
    null,
    bewoners_groep,
    base_at + interval '1 hour',
    base_at + interval '2 hours',
    'Huiskamer',
    'open',
    true,
    false,
    base_at - interval '1 day',
    base_at,
    bas_persoon,
    base_at,
    bas_persoon
  );

  insert into public.moment_groepen (id, moment_id, groep_id, context_type)
  values (
    '8e2e1100-0000-4000-8000-000000000001'::uuid,
    '8e2e1000-0000-4000-8000-000000000001'::uuid,
    bewoners_groep,
    'bewoners'
  );

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    created_at,
    updated_at
  ) values (
    '8e2e2000-0000-4000-8000-000000000001'::uuid,
    '8e2e1000-0000-4000-8000-000000000001'::uuid,
    sam_profiel,
    'voorgesteld',
    bas_persoon,
    bas_profiel,
    base_at,
    base_at,
    base_at
  );

  insert into public.voorstellen (
    id,
    type,
    status,
    ontvangend_profiel_id,
    voorgesteld_door_persoon_id,
    voorgesteld_vanuit_profiel_id,
    titel,
    toelichting,
    gekoppeld_type,
    gekoppeld_id,
    created_at,
    updated_at
  ) values (
    '8e2e3000-0000-4000-8000-000000000001'::uuid,
    'deelname_aan_moment',
    'open',
    sam_profiel,
    bas_persoon,
    bas_profiel,
    'E2E voorstel koffieochtend',
    'Open voorstel voor browser-smoke op Mijn dag.',
    'moment',
    '8e2e1000-0000-4000-8000-000000000001'::uuid,
    base_at,
    base_at
  );

  insert into public.supportvragen (
    id,
    aangemaakt_door_persoon_id,
    aangemaakt_vanuit_profiel_id,
    onderwerp,
    omschrijving,
    status,
    toegewezen_aan_persoon_id,
    created_at,
    updated_at
  ) values (
    '8e2e4000-0000-4000-8000-000000000001'::uuid,
    sam_persoon,
    sam_profiel,
    'E2E supportvraag dagplanning',
    'Resetbare supportvraag voor browser-smoke.',
    'nieuw',
    sanne_persoon,
    base_at,
    base_at
  );

  insert into public.profieltoegangen (
    id,
    persoon_id,
    profiel_id,
    toegangstype,
    status,
    verleend_door_persoon_id,
    verleend_at,
    updated_at
  ) values (
    '8e2e9200-0000-4000-8000-000000000001'::uuid,
    sam_persoon,
    milan_profiel,
    'meekijken',
    'actief',
    sam_persoon,
    base_at,
    base_at
  )
  on conflict (id) do update
    set toegangstype = excluded.toegangstype,
        status = excluded.status,
        verleend_door_persoon_id = excluded.verleend_door_persoon_id,
        verleend_at = excluded.verleend_at,
        ingetrokken_at = null,
        ingetrokken_door_persoon_id = null,
        updated_at = excluded.updated_at;

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
    created_at,
    created_by_persoon_id
  ) values (
    doel_uuid,
    'E2E doel onder aandacht',
    'E2E doel voor doelacceptatie op Mijn dag.',
    doel_categorie,
    sam_profiel,
    null,
    'actief',
    base_at + interval '1 hour',
    base_at + interval '2 hours',
    base_at,
    sam_persoon
  );

  insert into public.doelacceptaties (
    id,
    doel_id,
    profiel_id,
    status,
    created_at
  ) values (
    doelacceptatie_uuid,
    doel_uuid,
    sam_profiel,
    'voorgesteld',
    base_at
  );

  insert into public.lijsten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    status,
    created_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '8e2e5000-0000-4000-8000-000000000001'::uuid,
    'E2E dagtaken',
    'Resetbare takenlijst voor browser-smoke.',
    lijst_categorie,
    null,
    bewoners_groep,
    'open',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  );

  insert into public.lijst_groepen (id, lijst_id, groep_id)
  values
  (
    '8e2e5300-0000-4000-8000-000000000001'::uuid,
    '8e2e5000-0000-4000-8000-000000000001'::uuid,
    bewoners_groep
  ),
  (
    '8e2e5300-0000-4000-8000-000000000002'::uuid,
    '8e2e5000-0000-4000-8000-000000000001'::uuid,
    medewerkers_groep
  );

  insert into public.taken (
    id,
    lijst_id,
    titel,
    beschrijving,
    status,
    sort_order,
    deadline_at,
    created_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values
  (
    '8e2e5100-0000-4000-8000-000000000001'::uuid,
    '8e2e5000-0000-4000-8000-000000000001'::uuid,
    'E2E actieve taak voor Sam',
    'Taak met actieve uitvoerder voor browser-smoke.',
    'open',
    1,
    base_at + interval '4 hours',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  ),
  (
    '8e2e5100-0000-4000-8000-000000000002'::uuid,
    '8e2e5000-0000-4000-8000-000000000001'::uuid,
    'E2E claimbare taak',
    'Taak zonder uitvoerder voor claim-scenario.',
    'open',
    2,
    base_at + interval '6 hours',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  );

  insert into public.taakuitvoerders (
    id,
    taak_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    created_at,
    updated_at
  ) values (
    '8e2e5200-0000-4000-8000-000000000001'::uuid,
    '8e2e5100-0000-4000-8000-000000000001'::uuid,
    sam_profiel,
    'actief',
    sam_persoon,
    base_at,
    base_at,
    base_at
  );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values (
    '8e2e6000-0000-4000-8000-000000000001'::uuid,
    'E2E rolmoment begeleiding',
    'Resetbare rolfixture voor medewerkers.',
    moment_categorie,
    null,
    medewerkers_groep,
    base_at + interval '5 hours',
    base_at + interval '6 hours',
    'Zaal',
    'open',
    true,
    false,
    base_at - interval '1 day',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  );

  insert into public.moment_groepen (id, moment_id, groep_id, context_type)
  values (
    '8e2e1100-0000-4000-8000-000000000002'::uuid,
    '8e2e6000-0000-4000-8000-000000000001'::uuid,
    medewerkers_groep,
    'medewerkers'
  );

  insert into public.momentrollen (
    id,
    moment_id,
    roltype,
    titel,
    omschrijving,
    minimum_aantal,
    maximum_aantal,
    zichtbaar_voor_groep_id,
    verplicht_voor_doorgang,
    status,
    created_at,
    created_by_persoon_id,
    updated_at
  ) values
  (
    '8e2e6100-0000-4000-8000-000000000001'::uuid,
    '8e2e6000-0000-4000-8000-000000000001'::uuid,
    'begeleider',
    'E2E claimbare begeleider',
    'Open rol zonder bezetting.',
    1,
    1,
    medewerkers_groep,
    false,
    'open',
    base_at,
    sanne_persoon,
    base_at
  ),
  (
    '8e2e6100-0000-4000-8000-000000000002'::uuid,
    '8e2e6000-0000-4000-8000-000000000001'::uuid,
    'ondersteuner',
    'E2E actieve ondersteuner',
    'Rol met actieve bezetting voor Milan.',
    1,
    1,
    medewerkers_groep,
    false,
    'gevuld',
    base_at,
    sanne_persoon,
    base_at
  );

  insert into public.rolbezettingen (
    id,
    momentrol_id,
    profiel_id,
    status,
    geclaimd_door_persoon_id,
    geclaimd_at,
    created_at,
    updated_at
  ) values (
    '8e2e6200-0000-4000-8000-000000000001'::uuid,
    '8e2e6100-0000-4000-8000-000000000002'::uuid,
    milan_profiel,
    'actief',
    milan_persoon,
    base_at,
    base_at,
    base_at
  );

  insert into public.momenten (
    id,
    titel,
    beschrijving,
    categorie_id,
    eigenaar_profiel_id,
    eigenaar_groep_id,
    start_at,
    eind_at,
    locatie,
    status,
    inschrijving_open,
    gasttoegang,
    zichtbaar_vanaf_at,
    created_at,
    created_by_persoon_id,
    updated_at,
    updated_by_persoon_id
  ) values
  (
    '8e2e7000-0000-4000-8000-000000000001'::uuid,
    'E2E gastmoment welkom',
    'Gastzichtbaar moment voor Gijs.',
    moment_categorie,
    null,
    gasten_groep,
    base_at + interval '8 hours',
    base_at + interval '9 hours',
    'Huiskamer',
    'open',
    true,
    true,
    base_at - interval '1 day',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  ),
  (
    '8e2e7000-0000-4000-8000-000000000002'::uuid,
    'E2E intern bewonersmoment',
    'Niet gastzichtbaar controlemoment.',
    moment_categorie,
    null,
    bewoners_groep,
    base_at + interval '10 hours',
    base_at + interval '11 hours',
    'Kantoor',
    'open',
    true,
    false,
    base_at - interval '1 day',
    base_at,
    sanne_persoon,
    base_at,
    sanne_persoon
  );

  insert into public.moment_groepen (id, moment_id, groep_id, context_type)
  values
  (
    '8e2e1100-0000-4000-8000-000000000003'::uuid,
    '8e2e7000-0000-4000-8000-000000000001'::uuid,
    gasten_groep,
    'gasten'
  ),
  (
    '8e2e1100-0000-4000-8000-000000000004'::uuid,
    '8e2e7000-0000-4000-8000-000000000002'::uuid,
    bewoners_groep,
    'bewoners'
  );

  insert into public.deelnames (
    id,
    moment_id,
    profiel_id,
    status,
    aangemeld_door_persoon_id,
    aangemeld_vanuit_profiel_id,
    status_updated_at,
    geaccepteerd_at,
    created_at,
    updated_at
  ) values (
    '8e2e7200-0000-4000-8000-000000000001'::uuid,
    '8e2e7000-0000-4000-8000-000000000001'::uuid,
    gijs_profiel,
    'ingeschreven',
    gijs_persoon,
    gijs_profiel,
    base_at,
    base_at,
    base_at,
    base_at
  );

  insert into public.signalen (
    id,
    niveau,
    status,
    titel,
    omschrijving,
    gericht_aan_profiel_id,
    gekoppeld_type,
    gekoppeld_id,
    created_at,
    created_by_persoon_id
  ) values (
    '8e2e8000-0000-4000-8000-000000000001'::uuid,
    'actie_nodig',
    'zichtbaar',
    'E2E aandachtspunt voor Sam',
    'Resetbaar aandachtspunt voor Mijn dag.',
    sam_profiel,
    null,
    null,
    base_at,
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
    supportvraag_id,
    gekoppeld_type,
    gekoppeld_id,
    urgent,
    zichtbaar_vanaf_at,
    created_at,
    updated_at
  ) values (
    '8e2e8100-0000-4000-8000-000000000001'::uuid,
    'supportvraag',
    'nieuw',
    'E2E support zichtbaar voor Sam',
    'Tijdlijnbericht bij de resetbare supportvraag.',
    sanne_persoon,
    sanne_profiel,
    sam_profiel,
    '8e2e4000-0000-4000-8000-000000000001'::uuid,
    'supportvraag',
    '8e2e4000-0000-4000-8000-000000000001'::uuid,
    false,
    base_at - interval '1 day',
    base_at,
    base_at
  );
end $$;

commit;
