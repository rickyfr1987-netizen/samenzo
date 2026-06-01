-- SAM&ZO dev/test seeddata 017.
-- NIET VOOR PRODUCTIE.
-- Deze data is volledig fictief en alleen bedoeld voor lokale/dev/test-RLS-controle.
-- Gebruik geen productiegegevens, echte persoonsgegevens, echte wachtwoorden of secrets in dit bestand.
-- Er wordt niet rechtstreeks in auth.users geschreven.
-- auth_user_id blijft voorlopig NULL. TODO: koppel later aan echte Supabase Auth testusers.
-- RLS-auth-tests werken pas volledig zodra personen.auth_user_id gekoppeld is aan echte testusers.
-- Seed is bedoeld voor een lege dev/test-database na review van de migrations.

-- ---------------------------------------------------------------------------
-- Vaste UUID's voor herhaalbare tests
-- ---------------------------------------------------------------------------
-- Personen
-- 10000000-0000-4000-8000-000000000001 Gijs Gast
-- 10000000-0000-4000-8000-000000000002 Noor Bewoner
-- 10000000-0000-4000-8000-000000000003 Sam Bewoner
-- 10000000-0000-4000-8000-000000000004 Lotte Lid
-- 10000000-0000-4000-8000-000000000005 Vera Vrijwilliger
-- 10000000-0000-4000-8000-000000000006 Milan Medewerker
-- 10000000-0000-4000-8000-000000000007 Sanne Systeemondersteuner
-- 10000000-0000-4000-8000-000000000008 Bas Beheerder

-- ---------------------------------------------------------------------------
-- 1. Personen: account/authenticatie/actor, los van Profiel
-- ---------------------------------------------------------------------------
insert into personen (
  id,
  auth_user_id,
  email,
  accountnaam,
  systeemrol,
  status
) values
  ('10000000-0000-4000-8000-000000000001', null, 'gijs.gast@example.test', 'Gijs Gast', 'gast', 'actief'),
  ('10000000-0000-4000-8000-000000000002', null, 'noor.bewoner@example.test', 'Noor Bewoner', 'lid', 'actief'),
  ('10000000-0000-4000-8000-000000000003', null, 'sam.bewoner@example.test', 'Sam Bewoner', 'lid', 'actief'),
  ('10000000-0000-4000-8000-000000000004', null, 'lotte.lid@example.test', 'Lotte Lid', 'lid', 'actief'),
  ('10000000-0000-4000-8000-000000000005', null, 'vera.vrijwilliger@example.test', 'Vera Vrijwilliger', 'lid', 'actief'),
  ('10000000-0000-4000-8000-000000000006', null, 'milan.medewerker@example.test', 'Milan Medewerker', 'medewerker', 'actief'),
  ('10000000-0000-4000-8000-000000000007', null, 'sanne.systeemondersteuner@example.test', 'Sanne Systeemondersteuner', 'systeemondersteuner', 'actief'),
  ('10000000-0000-4000-8000-000000000008', null, 'bas.beheerder@example.test', 'Bas Beheerder', 'systeembeheerder', 'actief')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Profielen: functionele appwerkelijkheid, los van Persoon als actor
-- ---------------------------------------------------------------------------
insert into profielen (
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
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Gijs Gast', 'Fictief gastprofiel voor gasttoegang-tests.', 'actief', true, true, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Noor Bewoner', 'Fictief bewonersprofiel voor persoonlijke regie-tests.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Sam Bewoner', 'Fictief bewonersprofiel voor gedeelde planning-tests.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Lotte Lid', 'Fictief lidprofiel voor groep- en tijdlijntests.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Vera Vrijwilliger', 'Fictief vrijwilligersprofiel voor open rollen.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'Milan Medewerker', 'Fictief medewerkerprofiel met beperkte profieltoegang.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000007', 'Sanne Systeemondersteuner', 'Fictief systeemondersteunerprofiel voor supportcontext.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', 'Bas Beheerder', 'Fictief beheerprofiel voor systeembeheercontext.', 'actief', true, false, false, '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Groepen: primair filtermechanisme
-- ---------------------------------------------------------------------------
insert into groepen (
  id,
  naam,
  beschrijving,
  zichtbaarheid,
  groepstype,
  status,
  created_by_persoon_id
) values
  ('30000000-0000-4000-8000-000000000001', 'Bewoners', 'Fictieve bewonersgroep voor planning en documenten.', 'zichtbaar', 'bewonersgroep', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('30000000-0000-4000-8000-000000000002', 'Vrijwilligers', 'Fictieve vrijwilligersgroep voor open rollen.', 'zichtbaar', 'vrijwilligersgroep', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('30000000-0000-4000-8000-000000000003', 'Medewerkers', 'Fictieve medewerkersgroep voor uitvoeringscontext.', 'verborgen', 'medewerkersgroep', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('30000000-0000-4000-8000-000000000004', 'Open Huis', 'Fictieve brede groep voor gasttoegankelijke activiteiten.', 'zichtbaar', 'algemeen', 'actief', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

-- Groepslidmaatschappen koppelen Profiel aan Groep, niet Persoon aan Groep.
insert into groepslidmaatschappen (
  id,
  groep_id,
  profiel_id,
  status,
  toegevoegd_door_persoon_id
) values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000006', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000007', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('31000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000008', 'actief', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

-- Groepsrollen zijn informatieve tekst en geven geen technische rechten.
insert into groepsrollen (
  id,
  groep_id,
  profiel_id,
  rolnaam,
  icoon,
  zichtbaar
) values
  ('32000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Bewoner', 'home', true),
  ('32000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'Bewoner', 'home', true),
  ('32000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'Vrijwilliger', 'hand-heart', true),
  ('32000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000006', 'Medewerker', 'clipboard-list', true),
  ('32000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000007', 'Systeemondersteuner', 'shield', true)
on conflict (id) do nothing;

-- Profieltoegang geeft zicht/handelingsruimte, geen definitief mutatierecht.
insert into profieltoegangen (
  id,
  persoon_id,
  profiel_id,
  toegangstype,
  status,
  verleend_door_persoon_id,
  verleend_at
) values
  ('33000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'meekijken', 'actief', '10000000-0000-4000-8000-000000000008', '2026-01-01 09:00:00+00'),
  ('33000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'meekijken', 'actief', '10000000-0000-4000-8000-000000000008', '2026-01-01 09:05:00+00'),
  ('33000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'support', 'actief', '10000000-0000-4000-8000-000000000008', '2026-01-01 09:10:00+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Categorieen: gedragsconfiguratie, geen rechtenlaag
-- ---------------------------------------------------------------------------
insert into categorieen (
  id,
  naam,
  beschrijving,
  entiteit_type,
  status,
  is_systeem_default,
  created_by_persoon_id
) values
  ('40000000-0000-4000-8000-000000000001', 'Maaltijd', 'Fictieve momentcategorie voor maaltijdplanning.', 'moment', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000002', 'Activiteit', 'Fictieve momentcategorie voor activiteiten met rollen.', 'moment', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000003', 'Vergadering', 'Fictieve momentcategorie voor bewonersoverleg.', 'moment', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000004', 'Dienst', 'Fictieve momentcategorie voor begeleide dienstcontext.', 'moment', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000005', 'Doel licht', 'Fictieve doelcategorie zonder prestatiedashboard.', 'doel', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000006', 'Praktische lijst', 'Fictieve lijstcategorie voor uitvoeringswerk.', 'lijst', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000007', 'Informatiedocument', 'Fictieve documentcategorie zonder dossierinhoud.', 'document', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000008', 'Aandachtssignaal', 'Fictieve signaalcategorie voor aandacht zonder toegangsbewijs.', 'signaal', 'actief', true, '10000000-0000-4000-8000-000000000008'),
  ('40000000-0000-4000-8000-000000000009', 'Tijdlijnmelding', 'Fictieve tijdlijncategorie zonder chatfunctionaliteit.', 'tijdlijnbericht', 'actief', true, '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

insert into categorie_configuraties (
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
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '{"velden":["titel","start_at","locatie"]}'::jsonb, '{"acties":["bekijken","voorstellen"]}'::jsonb, '{"statussen":["gepland","open","afgerond"]}'::jsonb, '{"momentrollen":["deelnemer","ondersteuner"]}'::jsonb, '{}'::jsonb, '{"gasttoegang_mogelijk":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '{"velden":["titel","capaciteit"]}'::jsonb, '{"acties":["bekijken","rol_claimen"]}'::jsonb, '{"statussen":["open","gepland"]}'::jsonb, '{"momentrollen":["deelnemer","uitvoerder","ondersteuner"]}'::jsonb, '{"open_rol":true}'::jsonb, '{"gasttoegang_mogelijk":false}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '{"velden":["titel","agenda"]}'::jsonb, '{"acties":["uitnodigen","voorstellen"]}'::jsonb, '{"statussen":["gepland","gewijzigd"]}'::jsonb, '{"momentrollen":["deelnemer","organisator"]}'::jsonb, '{}'::jsonb, '{"groep_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', '{"velden":["titel","tijdvak"]}'::jsonb, '{"acties":["bekijken"]}'::jsonb, '{"statussen":["gepland","afgerond"]}'::jsonb, '{"momentrollen":["begeleider","organisator"]}'::jsonb, '{"begeleidingscontext":true}'::jsonb, '{"medewerker_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', '{"velden":["titel","beschrijving"]}'::jsonb, '{"acties":["bekijken"]}'::jsonb, '{"statussen":["actief","gepauzeerd","afgerond"]}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"eigenaar_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', '{"velden":["titel","taken"]}'::jsonb, '{"acties":["taak_bekijken","taak_uitvoeren"]}'::jsonb, '{"statussen":["open","bezig","afgerond"]}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"groep_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', '{"velden":["titel","samenvatting","inhoud"]}'::jsonb, '{"acties":["lezen"]}'::jsonb, '{"statussen":["concept","gepubliceerd"]}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"publicatie_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', '{"velden":["titel","niveau"]}'::jsonb, '{"acties":["bekijken","afhandelen"]}'::jsonb, '{"statussen":["nieuw","zichtbaar","afgehandeld"]}'::jsonb, '{}'::jsonb, '{"aandacht":true}'::jsonb, '{"ontvanger_context":true}'::jsonb, '{}'::jsonb),
  ('41000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000009', '{"velden":["titel","inhoud"]}'::jsonb, '{"acties":["lezen","markeren_gelezen"]}'::jsonb, '{"statussen":["nieuw","gelezen","afgehandeld"]}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"ontvanger_context":true}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Momenten: Planning als gemeenschappelijke werkelijkheid
-- ---------------------------------------------------------------------------
insert into momenten (
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
  ('50000000-0000-4000-8000-000000000001', 'Open lunch in de buurtkamer', 'Fictieve gasttoegankelijke maaltijd voor RLS-zichtbaarheid.', '40000000-0000-4000-8000-000000000001', null, '30000000-0000-4000-8000-000000000004', '2026-06-08 12:00:00+00', '2026-06-08 13:00:00+00', 'Buurtkamer', 'open', true, 20, true, '2026-06-01 08:00:00+00', '10000000-0000-4000-8000-000000000008'),
  ('50000000-0000-4000-8000-000000000002', 'Tuinactiviteit met open rol', 'Fictieve activiteit met een open ondersteunersrol.', '40000000-0000-4000-8000-000000000002', null, '30000000-0000-4000-8000-000000000002', '2026-06-09 14:00:00+00', '2026-06-09 16:00:00+00', 'Tuin', 'open', true, 12, false, '2026-06-01 08:00:00+00', '10000000-0000-4000-8000-000000000008'),
  ('50000000-0000-4000-8000-000000000003', 'Bewonersvergadering juni', 'Fictieve vergadering met uitnodigings- en voorstelcontext.', '40000000-0000-4000-8000-000000000003', null, '30000000-0000-4000-8000-000000000001', '2026-06-10 18:30:00+00', '2026-06-10 20:00:00+00', 'Huiskamer', 'gepland', false, 30, false, '2026-06-01 08:00:00+00', '10000000-0000-4000-8000-000000000008'),
  ('50000000-0000-4000-8000-000000000004', 'Avonddienst begeleiding', 'Fictieve dienstcontext voor begeleidingsnotitie-tests.', '40000000-0000-4000-8000-000000000004', null, '30000000-0000-4000-8000-000000000003', '2026-06-11 17:00:00+00', '2026-06-11 21:00:00+00', 'Dienstkamer', 'gepland', false, null, false, '2026-06-01 08:00:00+00', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

insert into moment_groepen (
  id,
  moment_id,
  groep_id,
  context_type
) values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'gasttoegang'),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'vrijwilligers'),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'bewoners'),
  ('51000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', 'medewerkers')
on conflict (id) do nothing;

insert into deelnames (
  id,
  moment_id,
  profiel_id,
  status,
  aangemeld_door_persoon_id,
  aangemeld_vanuit_profiel_id,
  status_updated_at,
  geaccepteerd_at
) values
  ('52000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'ingeschreven', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '2026-06-02 10:00:00+00', '2026-06-02 10:00:00+00'),
  ('52000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'voorgesteld', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '2026-06-02 10:10:00+00', null),
  ('52000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'uitgenodigd', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '2026-06-02 10:20:00+00', null)
on conflict (id) do nothing;

insert into momentrollen (
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
  ('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'ondersteuner', 'Tuinondersteuner', 'Fictieve open rol voor hulp bij klaarzetten.', 1, 2, '30000000-0000-4000-8000-000000000002', false, 'open', '10000000-0000-4000-8000-000000000008'),
  ('53000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000003', 'organisator', 'Vergadering voorbereiden', 'Fictieve organisatorrol voor bewonersvergadering.', 1, 1, '30000000-0000-4000-8000-000000000003', true, 'gevuld', '10000000-0000-4000-8000-000000000008'),
  ('53000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000004', 'begeleider', 'Dienstbegeleider', 'Fictieve begeleidersrol voor dienstcontext.', 1, 1, '30000000-0000-4000-8000-000000000003', true, 'gevuld', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

insert into rolbezettingen (
  id,
  momentrol_id,
  profiel_id,
  status,
  geclaimd_door_persoon_id,
  geclaimd_at
) values
  ('54000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'actief', '10000000-0000-4000-8000-000000000005', '2026-06-02 11:00:00+00'),
  ('54000000-0000-4000-8000-000000000002', '53000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000006', 'actief', '10000000-0000-4000-8000-000000000006', '2026-06-02 11:10:00+00'),
  ('54000000-0000-4000-8000-000000000003', '53000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000006', 'actief', '10000000-0000-4000-8000-000000000006', '2026-06-02 11:20:00+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Doelen, lijsten en taken: licht, geen prestatiedashboard
-- ---------------------------------------------------------------------------
insert into doelen (
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
  ('60000000-0000-4000-8000-000000000001', 'Rustig meedoen aan weekactiviteiten', 'Fictief licht doel voor planning en aandacht.', '40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', null, 'actief', '2026-06-01 00:00:00+00', '2026-07-01 00:00:00+00', '10000000-0000-4000-8000-000000000006'),
  ('60000000-0000-4000-8000-000000000002', 'Samen tuinmoment voorbereiden', 'Fictief groepsdoel voor praktische samenwerking.', '40000000-0000-4000-8000-000000000005', null, '30000000-0000-4000-8000-000000000002', 'actief', '2026-06-01 00:00:00+00', '2026-07-01 00:00:00+00', '10000000-0000-4000-8000-000000000006')
on conflict (id) do nothing;

insert into doelacceptaties (
  id,
  doel_id,
  profiel_id,
  status,
  geaccepteerd_at
) values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'geaccepteerd', '2026-06-02 12:00:00+00'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'voorgesteld', null)
on conflict (id) do nothing;

insert into lijsten (
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
  ('62000000-0000-4000-8000-000000000001', 'Voorbereiding tuinactiviteit', 'Fictieve praktische lijst voor open rol-test.', '40000000-0000-4000-8000-000000000006', null, '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 'open', '10000000-0000-4000-8000-000000000006'),
  ('62000000-0000-4000-8000-000000000002', 'Persoonlijke dagvoorbereiding Noor', 'Fictieve lichte lijst voor Mijn dag-context.', '40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', null, null, '60000000-0000-4000-8000-000000000001', 'open', '10000000-0000-4000-8000-000000000006')
on conflict (id) do nothing;

insert into lijst_groepen (
  id,
  lijst_id,
  groep_id
) values
  ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into taken (
  id,
  lijst_id,
  titel,
  beschrijving,
  status,
  sort_order,
  deadline_at,
  created_by_persoon_id
) values
  ('64000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', 'Gereedschap klaarzetten', 'Fictieve taak voor vrijwilligerstest.', 'open', 1, '2026-06-09 13:30:00+00', '10000000-0000-4000-8000-000000000006'),
  ('64000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000002', 'Herinnering lunch bekijken', 'Fictieve taak zonder prestatiedashboard.', 'voorgesteld', 1, '2026-06-08 10:00:00+00', '10000000-0000-4000-8000-000000000006')
on conflict (id) do nothing;

insert into taakuitvoerders (
  id,
  taak_id,
  profiel_id,
  status,
  geclaimd_door_persoon_id,
  geclaimd_at
) values
  ('65000000-0000-4000-8000-000000000001', '64000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'actief', '10000000-0000-4000-8000-000000000005', '2026-06-02 13:00:00+00'),
  ('65000000-0000-4000-8000-000000000002', '64000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'voorgesteld', '10000000-0000-4000-8000-000000000006', '2026-06-02 13:10:00+00')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Documenten en begeleidingsnotities
-- ---------------------------------------------------------------------------
insert into documenten (
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
  ('70000000-0000-4000-8000-000000000001', 'Welkom bij de buurtkamer', 'Fictieve algemene informatie voor leden en gasten.', 'Dit fictieve document bevat alleen algemene dev/testinformatie en geen persoonlijke dossierinformatie.', '40000000-0000-4000-8000-000000000007', null, '30000000-0000-4000-8000-000000000004', 'gepubliceerd', '2026-06-01 09:00:00+00', '10000000-0000-4000-8000-000000000008'),
  ('70000000-0000-4000-8000-000000000002', 'Praktische informatie tuinactiviteit', 'Fictieve praktische informatie voor vrijwilligers.', 'Dit fictieve document beschrijft praktische voorbereiding en bevat geen zorginhoud of rapportage.', '40000000-0000-4000-8000-000000000007', null, '30000000-0000-4000-8000-000000000002', 'gepubliceerd', '2026-06-01 09:15:00+00', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

insert into document_groepen (
  id,
  document_id,
  groep_id
) values
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into document_koppelingen (
  id,
  document_id,
  gekoppeld_type,
  gekoppeld_id
) values
  ('72000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'moment', '50000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

-- Begeleidingsnotities zijn geen Documenten, hebben geen categorie en worden niet getagd.
insert into begeleidingsnotities (
  id,
  inhoud,
  status,
  moment_id,
  lijst_id,
  taak_id,
  betrokken_profiel_id,
  zichtbaar_voor_roltype,
  created_by_persoon_id
) values
  ('73000000-0000-4000-8000-000000000001', 'Fictieve veilige begeleidingsnotitie: let op rustige start van het testmoment. Geen echte persoonsgegevens.', 'actief', '50000000-0000-4000-8000-000000000004', null, null, '20000000-0000-4000-8000-000000000002', 'begeleider', '10000000-0000-4000-8000-000000000006'),
  ('73000000-0000-4000-8000-000000000002', 'Fictieve veilige begeleidingsnotitie: taakcontext voor testdoeleinden. Geen zorgdossierinformatie.', 'actief', null, null, '64000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'ondersteuner', '10000000-0000-4000-8000-000000000006')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Voorstellen, support, signalen en tijdlijn
-- ---------------------------------------------------------------------------
insert into voorstellen (
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
  verloopt_at
) values
  ('80000000-0000-4000-8000-000000000001', 'uitnodiging_moment', 'open', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 'Uitnodiging bewonersvergadering', 'Fictief voorstel: Sam beslist later zelf over deelname.', 'moment', '50000000-0000-4000-8000-000000000003', '2026-06-10 12:00:00+00'),
  ('80000000-0000-4000-8000-000000000002', 'deelname_aan_moment', 'open', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 'Lunch onder de aandacht', 'Fictief voorstel: Noor behoudt persoonlijke regie.', 'moment', '50000000-0000-4000-8000-000000000001', '2026-06-08 10:00:00+00')
on conflict (id) do nothing;

insert into supportvragen (
  id,
  aangemaakt_door_persoon_id,
  aangemaakt_vanuit_profiel_id,
  onderwerp,
  omschrijving,
  status,
  toegewezen_aan_persoon_id
) values
  ('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Vraag over planning', 'Fictieve lichte supportvraag over zichtbaarheid van een testmoment.', 'nieuw', '10000000-0000-4000-8000-000000000007')
on conflict (id) do nothing;

insert into signalen (
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
  ('82000000-0000-4000-8000-000000000001', 'aandacht_nodig', 'zichtbaar', 'Open rol bij tuinactiviteit', 'Fictief signaal voor open rol; geeft geen toegang tot gekoppelde items.', null, '30000000-0000-4000-8000-000000000002', 'moment', '50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007'),
  ('82000000-0000-4000-8000-000000000002', 'informatief', 'zichtbaar', 'Supportvraag ontvangen', 'Fictief signaal voor supportcontext; geeft geen toegang tot gekoppelde items.', '20000000-0000-4000-8000-000000000002', null, 'supportvraag', '81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007')
on conflict (id) do nothing;

insert into tijdlijnberichten (
  id,
  type,
  status,
  titel,
  inhoud,
  afzender_persoon_id,
  afzender_profiel_id,
  gericht_aan_profiel_id,
  gericht_aan_groep_id,
  voorstel_id,
  supportvraag_id,
  signaal_id,
  gekoppeld_type,
  gekoppeld_id,
  urgent,
  zichtbaar_vanaf_at
) values
  ('83000000-0000-4000-8000-000000000001', 'voorstel', 'nieuw', 'Voorstel voor bewonersvergadering', 'Fictief tijdlijnbericht bij voorstel; dit bericht geeft geen toegang tot het gekoppelde moment.', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', null, '80000000-0000-4000-8000-000000000001', null, null, 'moment', '50000000-0000-4000-8000-000000000003', false, '2026-06-02 14:00:00+00'),
  ('83000000-0000-4000-8000-000000000002', 'supportvraag', 'nieuw', 'Supportvraag is ontvangen', 'Fictief tijdlijnbericht voor lichte support; geen ticketmodule.', '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', null, null, '81000000-0000-4000-8000-000000000001', null, 'supportvraag', '81000000-0000-4000-8000-000000000001', false, '2026-06-02 14:10:00+00'),
  ('83000000-0000-4000-8000-000000000003', 'urgent_signaal', 'actie_nodig', 'Open rol vraagt aandacht', 'Fictief groepsbericht bij signaal; dit geeft geen toegang tot gekoppelde items.', '10000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', null, '30000000-0000-4000-8000-000000000002', null, null, '82000000-0000-4000-8000-000000000001', 'moment', '50000000-0000-4000-8000-000000000002', true, '2026-06-02 14:20:00+00')
on conflict (id) do nothing;

insert into notificatiestatussen (
  id,
  tijdlijnbericht_id,
  profiel_id,
  status,
  gelezen_at,
  afgehandeld_at
) values
  ('84000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'nieuw', null, null),
  ('84000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'nieuw', null, null),
  ('84000000-0000-4000-8000-000000000003', '83000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000005', 'actie_nodig', null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9. Tags en templates: lichte vindbaarheid, geen rechten of gedrag
-- ---------------------------------------------------------------------------
insert into tags (
  id,
  naam,
  beschrijving,
  status,
  created_by_persoon_id
) values
  ('90000000-0000-4000-8000-000000000001', 'maaltijd', 'Fictieve tag voor zoeken/filteren; geen rechtenbetekenis.', 'actief', '10000000-0000-4000-8000-000000000008'),
  ('90000000-0000-4000-8000-000000000002', 'tuin', 'Fictieve tag voor vindbaarheid; geen gedragsbetekenis.', 'actief', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

-- Tagkoppelingen worden niet gebruikt voor begeleidingsnotities en geven geen toegang tot gekoppelde items.
insert into tag_koppelingen (
  id,
  tag_id,
  gekoppeld_type,
  gekoppeld_id
) values
  ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'moment', '50000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'document', '70000000-0000-4000-8000-000000000002')
on conflict (id) do nothing;

insert into templates (
  id,
  naam,
  beschrijving,
  categorie_id,
  entiteit_type,
  template_data,
  status,
  created_by_persoon_id
) values
  ('92000000-0000-4000-8000-000000000001', 'Template eenvoudige activiteit', 'Fictieve lichte template; vervangt categorieen niet.', '40000000-0000-4000-8000-000000000002', 'moment', '{"titel":"Nieuwe activiteit","status":"concept"}'::jsonb, 'actief', '10000000-0000-4000-8000-000000000008'),
  ('92000000-0000-4000-8000-000000000002', 'Template informatiedocument', 'Fictieve lichte template zonder workflow- of rechtenlogica.', '40000000-0000-4000-8000-000000000007', 'document', '{"status":"concept","inhoud_hint":"Algemene informatie, geen dossierinhoud."}'::jsonb, 'actief', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;
