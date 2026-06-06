# Fase 2D eigen persoonlijk moment RLS-ontwerp v0.1

## Status

GO voor ontwerp.

Nog geen GO voor implementatie. Implementatie mag pas starten na een groene
pgTAP-pilot op een lokale Supabase-runtime of CI-runtime.

## Doel

Herontwerp de geparkeerde route voor Fase 2 Stap 2O-b: een eigen persoonlijk
moment aanmaken vanuit Mijn dag, RLS-first en zonder persoonlijke regie te
doorbreken.

Deze stap bouwt geen productcode, geen migratie, geen RPC, geen UI, geen
formulier en geen plusknop.

## Bronnen

- `docs/planning/samzo-bouwplan-v0.1.md`
- `docs/functional/mijn-dag-compositie-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `docs/testing/browser-testdata-v0.1.md`
- `supabase/migrations/20260601000500_moments_participation_roles.sql`
- `supabase/migrations/20260601001100_rls_helper_functions.sql`
- `supabase/migrations/20260601001400_rls_slice_2_moments_participation_roles.sql`
- `supabase/migrations/20260603073817_harden_proposal_response_workflow.sql`
- `supabase/migrations/20260607230000_harden_guest_access_context.sql`
- `supabase/tests/database/mijn_dag_persoonlijke_momenten_rls.test.sql`
- `supabase/tests/database/voorstellen_rls.test.sql`
- `src/lib/mijn-dag/items.ts`
- `src/lib/voorstellen/actions.ts`
- `src/lib/moment/participation.ts`

## Bestaande basis

`momenten` heeft al `eigenaar_profiel_id`, `eigenaar_groep_id` en een
constraint die precies een eigenaar vereist. Daarmee is een persoonlijke
afspraak functioneel een `momenten`-record met `eigenaar_profiel_id`.

De bestaande leesroute gebruikt `app_private.can_view_moment(id)`. Die helper
laat eigenaar-profielmomenten zien aan het eigen profiel, aan profieltoegang en
aan systeembeheerder, met een extra gastvoorwaarde: een gastsessie ziet alleen
momenten met `gasttoegang = true`.

De bestaande RLS-test
`mijn_dag_persoonlijke_momenten_rls.test.sql` bewijst al read-only dat:

- Sam zijn eigen eigenaar-profielmoment zonder deelname kan zien;
- Sam een gearchiveerd persoonlijk moment niet actief ziet;
- Gijs Sams persoonlijke moment niet ziet;
- Gijs zijn eigen gast-persoonlijk moment alleen ziet als `gasttoegang = true`.

De bestaande insertpolicy op `momenten` laat technisch inserts toe voor het
eigen profiel of systeembeheerder. Dat is niet genoeg als productroute: er is
geen centrale validatie van status, actorvelden, gastlogica, datumregel,
inschrijving, capaciteit of categorie. De UI mag dus niet rechtstreeks op deze
losse insert vertrouwen.

## Ontwerpkeuze

Gebruik later een smalle actie voor eigen persoonlijke momenten:

`maak_eigen_persoonlijk_moment`

De actie maakt precies een `momenten`-record aan en niets anders:

- geen `deelnames`;
- geen `moment_groepen`;
- geen `momentrollen`;
- geen voorstel;
- geen categoriegedreven rechten;
- geen beheerflow;
- geen begeleider-naar-client definitieve mutatie.

Aanbevolen databasevorm:

- `security invoker`;
- `public` RPC met expliciete `grant execute to authenticated`;
- gewone RLS blijft beslissend;
- geen service-role;
- geen `security definer` in de exposed `public` schema.

De RPC mag alleen slagen wanneer:

- `target_profiel_id = app_private.current_profiel_id()`;
- `app_private.current_persoon_id()` bestaat;
- `titel` niet leeg is;
- `start_at` verplicht is;
- `eind_at` leeg is of na `start_at` ligt;
- `categorie_id` een actieve categorie met `entiteit_type = 'moment'` is;
- `eigenaar_profiel_id = target_profiel_id`;
- `eigenaar_groep_id is null`;
- `status = 'gepland'`;
- `inschrijving_open = false`;
- `capaciteit is null`;
- `zichtbaar_vanaf_at` leeg of niet later dan `start_at` is;
- `created_by_persoon_id = app_private.current_persoon_id()`.

Gastkeuze:

- Een gastsessie mag alleen in de pilot worden meegenomen als de RPC
  `gasttoegang = true` zet voor het eigen gastprofiel.
- Voor niet-gastsessies zet de RPC `gasttoegang = false`.
- Deze keuze volgt de huidige `can_view_moment` guest-gate en voorkomt dat een
  gast een eigen moment maakt dat daarna onzichtbaar is.

## Geen begeleider-naar-client in deze route

Profieltoegang is kijk- en begeleidingsruimte, geen mandaat om definitieve
persoonlijke werkelijkheid te maken.

Daarom geldt:

- `has_profieltoegang(target_profiel_id)` mag deze RPC niet laten slagen;
- medewerkers, begeleiders, systeemondersteuners en systeembeheerders mogen
  via deze route niet namens een client een persoonlijk moment aanmaken;
- begeleider-naar-client moet later een aparte voorstelroute worden.

Die latere voorstelroute vraagt apart ontwerp, waarschijnlijk een nieuw
voorsteltype of een expliciet draft-/voorstelmodel voor een nog niet-definitief
persoonlijk moment.

## RLS- en grantkeuze voor implementatie

De bestaande policy `momenten_insert_eigen_profiel_of_systeembeheerder` is te
breed als productbewijs. De implementatiestap moet daarom eerst een pgTAP-pilot
schrijven die bewijst wat de huidige policy toestaat en daarna pas beslissen of
de policy wordt versmald.

Aanbevolen implementatierichting:

- behoud `momenten_select_can_view`;
- voeg een specifieke inserttest toe voor eigen persoonlijke momenten;
- voorkom dat status, groepseigenaarschap, inschrijving, capaciteit,
  gasttoegang en actorvelden vrij door de client kunnen worden gekozen;
- voeg expliciete grants toe waar Supabase Data API-toegang dat vereist;
- gebruik geen categorie als rechtenlaag.

Omdat Supabase sinds 2026 explicietere Data API-grants richting standaard maakt,
moet een migratie voor nieuwe functies altijd zichtbaar maken welke `grant`
nodig is. RLS blijft afzonderlijk leidend.

## Minimale pgTAP-pilot

Maak eerst een rollback-suite, bijvoorbeeld:

`supabase/tests/database/eigen_persoonlijk_moment_mutatie_rls.test.sql`

De suite bewijst minimaal:

1. Sam kan via de RPC een eigen persoonlijk moment maken.
2. Het record heeft `eigenaar_profiel_id = Sam`, geen `eigenaar_groep_id`,
   `status = 'gepland'`, `inschrijving_open = false`, geen capaciteit en
   `created_by_persoon_id = Sam`.
3. Sam kan het aangemaakte moment daarna lezen via RLS en Mijn dag-compositie
   kan het als persoonlijk moment op de gekozen dag ophalen.
4. Milan kan niet namens Sam aanmaken, ook niet met profieltoegang.
5. Bas kan niet via deze eigen-profielroute namens Sam aanmaken.
6. Gijs kan geen Sam-moment maken.
7. Gijs kan een eigen gastmoment alleen maken als de route bewust
   `gasttoegang = true` zet.
8. Ongeldige input faalt: lege titel, ontbrekende startdatum, eind voor start,
   niet-actieve categorie of verkeerde entiteitcategorie.
9. Er ontstaan geen `deelnames`, `moment_groepen` of `momentrollen`.
10. Gearchiveerde of ongeldige statussen kunnen niet via deze route ontstaan.

## UI- en helperroute na groene pilot

Pas na groene pgTAP-pilot:

- TypeScript-helper bouwen, bijvoorbeeld
  `src/lib/mijn-dag/personal-moments.ts`;
- component-/integratietests toevoegen voor foutmeldingen en successtaat;
- Mijn dag-plusknop alleen tonen wanneer het actieve profiel het eigen profiel
  is;
- formulier klein houden: titel, datum/tijd, eindtijd optioneel, locatie,
  beschrijving en categorie;
- geen persoonlijke taak, geen aandachtspunt en geen begeleider-naar-client in
  dezelfde UI-stap.

## Browserroute

Playwright blijft uitgesteld totdat Docker/lokale resetdata beschikbaar is.
Deze route mag niet groen gemaakt worden met remote Supabase-mutaties.

Wanneer Docker beschikbaar is:

- lokale Supabase starten;
- migraties en seed resetten;
- pgTAP-pilot draaien;
- pas daarna een kleine Playwright-flow toevoegen met resetbare data.

## Besluit

De veilige 2O-b-herstart is:

1. eerst pgTAP-pilot voor eigen persoonlijk momentmutatie;
2. daarna smalle RPC/helper;
3. daarna Mijn dag UI;
4. daarna pas browserflow met lokale resetdata;
5. begeleider-naar-client blijft een aparte voorstelroute.

Dit ontwerp is GO. Implementatie blijft geblokkeerd totdat de pgTAP-pilot groen
kan draaien in lokale Docker/Supabase of CI.
