-- SAM&ZO initial seed data.
-- Purpose: small, repeatable development/test dataset that matches the real schema exactly.
-- This migration does not create auth.users records and does not contain real personal data.

begin;

-- ---------------------------------------------------------------------------
-- Personen
-- ---------------------------------------------------------------------------
insert into public.personen (
  id,
  auth_user_id,
  email,
  accountnaam,
  systeemrol,
  status
) values
  ('00000000-0000-4000-8000-000000000001', null, 'bas.beheerder@example.test', 'Bas Beheerder', 'systeembeheerder', 'actief'),
  ('00000000-0000-4000-8000-000000000002', null, 'sanne.support@example.test', 'Sanne Systeemondersteuner', 'systeemondersteuner', 'actief'),
  ('00000000-0000-4000-8000-000000000003', null, 'milan.medewerker@example.test', 'Milan Medewerker', 'medewerker', 'actief'),
  ('00000000-0000-4000-8000-000000000004', null, 'sam.bewoner@example.test', 'Sam Bewoner', 'lid', 'actief'),
  ('00000000-0000-4000-8000-000000000005', null, 'gijs.gast@example.test', 'Gijs Gast', 'gast', 'actief')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Profielen
-- ---------------------------------------------------------------------------
insert into public.profielen (
  id,
  persoon_id,
  weergavenaam,
  kennismakingstekst,
  status,
  zichtbaar_voor_leden,
  zichtbaar_voor_gasten,
  contactgegevens_zichtbaar,
  created_by_persoon_id
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Bas Beheerder', 'Testprofiel voor systeembeheer.', 'actief', true, false, false, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Sanne Systeemondersteuner', 'Testprofiel voor supportcontext.', 'actief', true, false, false, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Milan Medewerker', 'Testprofiel voor medewerkercontext.', 'actief', true, false, false, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'Sam Bewoner', 'Testprofiel voor persoonlijke regie en Mijn dag.', 'actief', true, false, false, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'Gijs Gast', 'Testprofiel voor gasttoegang.', 'actief', true, true, false, '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Groepen en lidmaatschappen
-- ---------------------------------------------------------------------------
insert into public.groepen (
  id,
  naam,
  beschrijving,
  zichtbaarheid,
  groepstype,
  status,
  created_by_persoon_id
) values
  ('20000000-0000-4000-8000-000000000001', 'Iedereen', 'Algemene testgroep voor brede communicatie.', 'zichtbaar', 'algemeen', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Bewoners', 'Testgroep voor bewoners.', 'zichtbaar', 'bewonersgroep', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', 'Medewerkers', 'Testgroep voor medewerkers en ondersteuning.', 'verborgen', 'medewerkersgroep', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', 'Gasten', 'Testgroep voor gasttoegang.', 'zichtbaar', 'gastgroep', 'actief', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.groepslidmaatschappen (
  id,
  groep_id,
  profiel_id,
  status,
  toegevoegd_door_persoon_id
) values
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('21000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000005', 'actief', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.groepsrollen (
  id,
  groep_id,
  profiel_id,
  rolnaam,
  icoon,
  zichtbaar
) values
  ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Medewerker', 'clipboard-list', true),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'Bewoner', 'home', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Categorieen en configuraties
-- ---------------------------------------------------------------------------
insert into public.categorieen (
  id,
  naam,
  beschrijving,
  entiteit_type,
  status,
  is_systeem_default,
  created_by_persoon_id
) values
  ('30000000-0000-4000-8000-000000000001', 'Maaltijd', 'Momentcategorie voor testmaaltijden.', 'moment', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', 'Activiteit', 'Momentcategorie voor activiteiten.', 'moment', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000003', 'Dienst', 'Momentcategorie voor dienstcontext.', 'moment', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000004', 'Praktische lijst', 'Lijstcategorie voor praktische taken.', 'lijst', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000005', 'Document algemeen', 'Documentcategorie voor algemene informatie.', 'document', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000006', 'Doel licht', 'Doelcategorie zonder prestatiedashboard.', 'doel', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000007', 'Tijdlijnmelding', 'Categorie voor tijdlijnmeldingen.', 'tijdlijnbericht', 'actief', true, '00000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000008', 'Aandachtssignaal', 'Categorie voor signalen.', 'signaal', 'actief', true, '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.categorie_configuraties (
  id,
  categorie_id,
  velden_config,
  acties_config,
  statussen_config,
  rollen_config,
  signalen_config,
  zichtbaarheid_config,
  koppelingen_config
) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '{"velden":["titel","start_at","locatie"]}'::jsonb, '{"acties":["bekijken","voorstellen"]}'::jsonb, '{"statussen":["gepland","open","afgerond"]}'::jsonb, '{"momentrollen":["deelnemer","ondersteuner","organisator"]}'::jsonb, '{}'::jsonb, '{"gasttoegang_mogelijk":true}'::jsonb, '{}'::jsonb),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '{"velden":["titel","capaciteit"]}'::jsonb, '{"acties":["bekijken","rol_claimen"]}'::jsonb, '{"statussen":["open","gepland"]}'::jsonb, '{"momentrollen":["deelnemer","uitvoerder","ondersteuner","begeleider","organisator"]}'::jsonb, '{}'::jsonb, '{"groep_context":true}'::jsonb, '{}'::jsonb),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', '{"velden":["titel","taken"]}'::jsonb, '{"acties":["taak_bekijken","taak_uitvoeren"]}'::jsonb, '{"statussen":["open","bezig","afgerond"]}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"groep_context":true}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Momenten, groepen, deelnames en rollen
-- ---------------------------------------------------------------------------
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
  capaciteit,
  gasttoegang,
  zichtbaar_vanaf_at,
  created_by_persoon_id
) values
  ('40000000-0000-4000-8000-000000000001', 'Avondmaaltijd test', 'Testmoment voor maaltijdinschrijving.', '30000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000001', '2026-06-03 18:00:00+02', '2026-06-03 19:30:00+02', 'Gemeenschappelijke ruimte', 'open', true, 60, true, '2026-06-01 08:00:00+02', '00000000-0000-4000-8000-000000000001'),
  ('40000000-0000-4000-8000-000000000002', 'Zwemmen test', 'Testactiviteit met een ondersteunersrol.', '30000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000002', '2026-06-04 14:00:00+02', '2026-06-04 16:00:00+02', 'Zwembad', 'open', true, 8, false, '2026-06-01 08:00:00+02', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.moment_groepen (
  id,
  moment_id,
  groep_id,
  context_type
) values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'algemeen'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'bewoners')
on conflict (id) do nothing;

insert into public.deelnames (
  id,
  moment_id,
  profiel_id,
  status,
  aangemeld_door_persoon_id,
  aangemeld_vanuit_profiel_id,
  status_updated_at,
  geaccepteerd_at
) values
  ('42000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'ingeschreven', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '2026-06-02 10:00:00+02', '2026-06-02 10:00:00+02'),
  ('42000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'voorgesteld', '00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '2026-06-02 10:10:00+02', null)
on conflict (id) do nothing;

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
  created_by_persoon_id
) values
  ('43000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'ondersteuner', 'Ondersteuner zwemmen', 'Open ondersteunersrol voor testactiviteit.', 1, 1, '20000000-0000-4000-8000-000000000003', false, 'open', '00000000-0000-4000-8000-000000000001'),
  ('43000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'organisator', 'Organisator maaltijd', 'Organisatorrol voor testmaaltijd.', 1, 1, '20000000-0000-4000-8000-000000000003', true, 'gevuld', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.rolbezettingen (
  id,
  momentrol_id,
  profiel_id,
  status,
  geclaimd_door_persoon_id,
  geclaimd_at
) values
  ('44000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'actief', '00000000-0000-4000-8000-000000000003', '2026-06-02 11:00:00+02')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Doelen, lijsten en taken
-- ---------------------------------------------------------------------------
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
  ('50000000-0000-4000-8000-000000000001', 'Samen eten versterken', 'Licht testdoel zonder prestatiedashboard.', '30000000-0000-4000-8000-000000000006', null, '20000000-0000-4000-8000-000000000001', 'actief', '2026-06-01 00:00:00+02', '2026-07-01 00:00:00+02', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.lijsten (
  id,
  titel,
  beschrijving,
  categorie_id,
  eigenaar_profiel_id,
  eigenaar_groep_id,
  gekoppeld_moment_id,
  gekoppeld_doel_id,
  status,
  created_by_persoon_id
) values
  ('51000000-0000-4000-8000-000000000001', 'Keuken opruimen', 'Testlijst gekoppeld aan de avondmaaltijd.', '30000000-0000-4000-8000-000000000004', null, '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'open', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.taken (
  id,
  lijst_id,
  titel,
  beschrijving,
  status,
  sort_order,
  deadline_at,
  created_by_persoon_id
) values
  ('52000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'Tafel afruimen', 'Na de maaltijd de tafel afruimen.', 'open', 1, '2026-06-03 20:00:00+02', '00000000-0000-4000-8000-000000000001'),
  ('52000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000001', 'Vaatwasser inruimen', 'Borden en bekers inruimen.', 'open', 2, '2026-06-03 20:15:00+02', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Documenten
-- ---------------------------------------------------------------------------
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
  ('60000000-0000-4000-8000-000000000001', 'Huisregels testdocument', 'Algemeen testdocument voor de groep Iedereen.', 'Dit testdocument bevat algemene informatie en geen persoonlijke dossierinformatie.', '30000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000001', 'gepubliceerd', '2026-06-01 09:00:00+02', '00000000-0000-4000-8000-000000000001'),
  ('60000000-0000-4000-8000-000000000002', 'Handleiding apphulp testdocument', 'Praktische testhandleiding voor medewerkers.', 'Dit document legt fictief uit hoe iemand apphulp kan vragen.', '30000000-0000-4000-8000-000000000005', null, '20000000-0000-4000-8000-000000000003', 'gepubliceerd', '2026-06-01 09:15:00+02', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.document_groepen (
  id,
  document_id,
  groep_id
) values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Support, signalen en tijdlijn
-- ---------------------------------------------------------------------------
insert into public.supportvragen (
  id,
  aangemaakt_door_persoon_id,
  aangemaakt_vanuit_profiel_id,
  onderwerp,
  omschrijving,
  status,
  toegewezen_aan_persoon_id
) values
  ('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Testvraag over maaltijd', 'Fictieve lichte supportvraag voor testdoeleinden.', 'nieuw', '00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

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
  created_by_persoon_id
) values
  ('71000000-0000-4000-8000-000000000001', 'aandacht_nodig', 'zichtbaar', 'Open ondersteunersrol bij zwemmen', 'Voor het testmoment staat nog een ondersteunersrol open.', null, '20000000-0000-4000-8000-000000000003', 'moment', '40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

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
  supportvraag_id,
  signaal_id,
  gekoppeld_type,
  gekoppeld_id,
  urgent,
  zichtbaar_vanaf_at
) values
  ('72000000-0000-4000-8000-000000000001', 'algemeen_bericht', 'nieuw', 'Welkom in de SAM&ZO testomgeving', 'Dit is een fictief algemeen tijdlijnbericht.', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000001', null, null, null, null, false, '2026-06-01 10:00:00+02'),
  ('72000000-0000-4000-8000-000000000002', 'supportvraag', 'nieuw', 'Supportvraag ontvangen', 'Fictief tijdlijnbericht bij een lichte supportvraag.', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', null, '70000000-0000-4000-8000-000000000001', null, 'supportvraag', '70000000-0000-4000-8000-000000000001', false, '2026-06-01 10:05:00+02'),
  ('72000000-0000-4000-8000-000000000003', 'urgent_signaal', 'actie_nodig', 'Open rol vraagt aandacht', 'Fictief tijdlijnbericht bij een signaal; dit geeft geen toegang tot het gekoppelde item.', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000003', null, '71000000-0000-4000-8000-000000000001', 'moment', '40000000-0000-4000-8000-000000000002', true, '2026-06-01 10:10:00+02')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Tags en templates
-- ---------------------------------------------------------------------------
insert into public.tags (
  id,
  naam,
  beschrijving,
  status,
  created_by_persoon_id
) values
  ('80000000-0000-4000-8000-000000000001', 'maaltijd', 'Tag voor zoeken/filteren; geen rechtenbetekenis.', 'actief', '00000000-0000-4000-8000-000000000001'),
  ('80000000-0000-4000-8000-000000000002', 'ondersteuning-gezocht', 'Tag voor vindbaarheid; geen gedragsbetekenis.', 'actief', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.templates (
  id,
  naam,
  beschrijving,
  categorie_id,
  entiteit_type,
  template_data,
  status,
  created_by_persoon_id
) values
  ('81000000-0000-4000-8000-000000000001', 'Standaard avondmaaltijd', 'Lichte template voor een gewone avondmaaltijd.', '30000000-0000-4000-8000-000000000001', 'moment', '{"titel":"Nieuwe avondmaaltijd","status":"concept"}'::jsonb, 'actief', '00000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002', 'Activiteit met ondersteuning', 'Lichte template voor een activiteit met ondersteunersrol.', '30000000-0000-4000-8000-000000000002', 'moment', '{"titel":"Nieuwe activiteit","status":"concept"}'::jsonb, 'actief', '00000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

commit;
