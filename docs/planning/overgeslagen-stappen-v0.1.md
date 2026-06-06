# Overgeslagen stappen v0.1

Dit document houdt stappen bij die bewust niet zijn afgerond in de huidige
werkomgeving, maar later moeten worden ingehaald zodra de juiste runtime
beschikbaar is.

Uitgangspunten:

- Het bouwplan blijft leidend: `docs/planning/samzo-bouwplan-v0.1.md`.
- Docker-afhankelijke bewijsstappen worden niet vervangen door remote
  Supabase-mutaties.
- Wachtwoorden, tokens, service-role keys en echte persoonsgegevens worden niet
  in repo, test-artifacts of documentatie opgeslagen.
- Een ingehaalde stap krijgt opnieuw GO/FIX volgens het bouwplan.

## Open inhaalstappen

| Datum | Fase | Stap | Status | Waarom overgeslagen | Inhalen wanneer |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | 2 | 2C | Geparkeerd | De Playwright-smoke voor Mijn dag-login werkt deels, maar de doelacceptatieroute vereist resetbare lokale browserdata. De huidige omgeving gebruikt geen lokale Docker/Supabase-reset en de actieve backend bevat geen zichtbare `E2E doel onder aandacht` doelacceptatie voor Sam Bewoner. | Zodra een pc met Docker beschikbaar is en lokale Supabase/resetdata reproduceerbaar kan draaien. |
| 2026-06-06 | 2 | 2E / 2O-b | Niet gestart | Het 2D-ontwerp is afgerond, maar implementatie van eigen persoonlijk moment aanmaken mag pas na een groene pgTAP-pilot. Deze omgeving heeft geen lokale Docker/Supabase-runtime om die pilot betrouwbaar te bewijzen. | Zodra lokale Docker/Supabase of een expliciet goedgekeurde CI-route de pgTAP-pilot groen kan draaien. |
| 2026-06-06 | 3 | 3C / 3E-RLS | Overgeslagen op verzoek | De pgTAP-suite en migratie voor Planning momentbeheer zijn geschreven, maar `npm.cmd run test:rls` kan niet verbinden met lokale Postgres op `127.0.0.1:54322` omdat Docker Desktop daemon niet beschikbaar is. Na 3D-FIX zijn typecheck, lint en gerichte Vitest groen, maar 3E blijft formeel FIX zolang RLS niet op een Docker-runtime bewezen is. Op expliciet verzoek wordt deze bewijsstap niet opnieuw herhaald zonder Docker op een Shadow Cloud PC. | Zodra een Shadow Cloud PC met Docker/lokale Supabase beschikbaar is, of zodra een expliciet goedgekeurde CI-route deze pgTAP-suite draait. |
| 2026-06-06 | 4 | 4B | Overgeslagen op verzoek | Het 4A-ontwerp staat op GO, maar 4B is niet gestart omdat `npm.cmd run test:rls` lokaal niet kan verbinden met Postgres op `127.0.0.1:54322` en het daardoor niet aantoonbaar is dat de nieuwe lijst-/taak-beheer-RPCs met privacy en RLS veilig zijn. | Zodra lokale Docker/Supabase op een Shadow Cloud PC beschikbaar is, of zodra `supabase/tests/database/lijst_taakbeheer_rls.test.sql` via goedgekeurde CI-route groen draait. |

## Detail: Fase 2 Stap 2C

Doel dat nog ingehaald moet worden:

- Mijn dag laden met echte Auth-profielcontext.
- Datumwissel bewijzen.
- Profielwissel bewijzen.
- Doelacceptatieactie bewijzen met resetbare testdata.

Huidige stand op 2026-06-06:

- Login via `/beheer/dev-login` werkt met runtime-only `SAMZO_E2E_*`.
- Playwright moet via `localhost` draaien; `127.0.0.1` blokkeert in Next dev
  de HMR/hydration-route.
- De eerste rooktest voor Mijn dag-profielcontext is groen.
- De tweede rooktest faalt op ontbrekende doelacceptatie-fixturedata.
- Authenticated RLS-clientcheck voor Sam Bewoner gaf `0` zichtbare
  doelacceptaties terug.

Niet doen bij het inhalen:

- Geen remote Supabase-data muteren om deze browserflow groen te krijgen.
- Geen service-role key gebruiken in frontend, Playwright of repo.
- Geen wachtwoord of Auth-user-id vastleggen.
- Geen nieuwe persoonlijke mutatie bouwen als onderdeel van deze inhaalstap.

Benodigde route om in te halen:

1. Start lokale Supabase met Docker.
2. Breng de lokale database naar de normale migratie- en seedbasis.
3. Pas de resetbare browserdata toe uit
   `tests/e2e/fixtures/reset-browser-data.sql`.
4. Zet runtime-only:
   - `SAMZO_E2E_EMAIL`
   - `SAMZO_E2E_PASSWORD`
   - `SAMZO_E2E_PROFILE_NAME`
5. Draai:
   `npm.cmd run test:e2e -- tests/e2e/mijn-dag-auth-smoke.spec.ts`

GO pas wanneer:

- beide Playwright-tests groen zijn;
- de doelacceptatieactie zichtbaar en uitvoerbaar is voor het eigen profiel;
- profielwissel naar een bekeken profiel geen eigen-profielacties toestaat;
- geen secrets of echte persoonsgegevens in artifacts terechtkomen.

FIX wanneer:

- lokale resetdata niet reproduceerbaar is;
- de test remote data nodig heeft;
- de doelacceptatie via gekoppelde items extra leesrecht lijkt te geven;
- de flow actieknoppen toont in andermans profielperspectief.

## Detail: Fase 2 Stap 2E / 2O-b

Doel dat nog ingehaald moet worden:

- Een pgTAP-pilot schrijven en groen draaien voor eigen persoonlijk moment
  aanmaken.
- Pas daarna de smalle RPC/helper en UI-route bouwen.
- Browserflow pas toevoegen na lokale resetdata.

Huidige stand op 2026-06-06:

- Het ontwerp staat in
  `docs/architecture/fase-2d-eigen-persoonlijk-moment-rls-ontwerp-v0.1.md`.
- De gekozen route is: eerst RLS-pilot, daarna `maak_eigen_persoonlijk_moment`,
  daarna Mijn dag UI.
- Begeleider-naar-client blijft voorstelgestuurd en hoort niet bij deze
  inhaalstap.

Niet doen bij het inhalen:

- Geen directe clientinsert als productroute.
- Geen plusknop voordat RLS/RPC groen is.
- Geen persoonlijke taak of persoonlijk aandachtspunt meebouwen.
- Geen begeleider-naar-client definitieve mutatie.

GO pas wanneer:

- pgTAP positief bewijst dat het eigen profiel een eigen persoonlijk moment kan
  maken;
- pgTAP negatief bewijst dat profieltoegang, beheercontext en andere profielen
  niet namens Sam kunnen handelen;
- het aangemaakte moment geen deelname, groep, rol, capaciteit of open
  inschrijving aanmaakt;
- gastgedrag expliciet klopt met `gasttoegang`.

FIX wanneer:

- de route alleen met remote data bewezen kan worden;
- `has_profieltoegang` definitieve persoonlijke werkelijkheid kan maken;
- categorieen als rechtenlaag gaan werken;
- de implementatie meerdere persoonlijke itemtypes tegelijk bouwt.

## Detail: Fase 3 Stap 3C / 3E-RLS

Doel dat nog ingehaald moet worden:

- Lokale of CI-pgTAP-run uitvoeren voor
  `supabase/tests/database/planning_momentbeheer_rls.test.sql`.
- Bewijzen dat `maak_groep_moment`, `wijzig_groep_moment` en
  `archiveer_groep_moment` RLS-first werken.
- Eventuele SQL/RLS-fouten uit die runtime-run herstellen.
- Daarna Fase 3E opnieuw beoordelen voor definitieve GO/FIX.

Huidige stand op 2026-06-06:

- De pgTAP-suite is toegevoegd.
- De migratie `20260606191617_add_planning_moment_management_rpcs.sql` is via
  `npx.cmd supabase migration new` aangemaakt en ingevuld.
- Typecheck, lint en Vitest zijn groen.
- `npm.cmd run test:rls` faalt voordat tests starten omdat lokale Supabase
  Postgres niet draait.
- `docker version` toont dat de Docker client bestaat, maar de Docker Desktop
  Linux engine/daemon niet bereikbaar is.
- Na 3D-FIX zijn `npm.cmd run typecheck`, `npm.cmd run lint` en gerichte Vitest
  groen.
- 3E is opnieuw uitgevoerd en blijft formeel FIX omdat `test:rls` niet kan
  verbinden met `127.0.0.1:54322`.
- Op 2026-06-06 is op gebruikersverzoek vastgelegd dat deze stap niet opnieuw
  herhaald wordt zonder Docker op een Shadow Cloud PC.

Niet doen bij het inhalen:

- Geen remote Supabase-data gebruiken om deze RLS-route groen te krijgen.
- Geen service-role gebruiken in tests, frontend of helper.
- Geen nieuwe RLS- of muterende buildstappen starten die afhankelijk zijn van
  dit onbewezen momentbeheerpad.
- Geen gasttoegang verbreden om de test makkelijker te maken.

GO pas wanneer:

- `npm.cmd run test:rls` groen draait voor de volledige pgTAP-suite;
- Bas als systeembeheerder groepmomenten kan maken, wijzigen en archiveren;
- Sam, Milan en Gijs geen momentbeheerrechten krijgen;
- gearchiveerde momenten niet actief zichtbaar blijven;
- gasttoegang alleen werkt voor de expliciete gastcontext;
- create/edit/archive geen deelnames, rollen, voorstellen, tijdlijnberichten,
  signalen, taken of supportvragen aanmaken.

FIX wanneer:

- Docker/lokale Supabase niet beschikbaar is;
- de route alleen met service-role werkt;
- een public `security definer` nodig lijkt;
- `has_profieltoegang` beheer opent;
- persoonlijke eigenaarmomenten via deze route geraakt worden;
- `moment_groepen` niet consistent blijft met `eigenaar_groep_id`;
- interne momenten zichtbaar worden voor gasten.

## Detail: Fase 4 Stap 4B

Doel dat nog ingehaald moet worden:

- Groepseigen lijstcreate/edit/archive implementeren op smalle beheer-RPCs.
- Taakcreate/edit/archive implementeren binnen beheerbare lijsten.
- Beheerstromen mogen alleen via RLS-proof en eigen-persoonsregels lopen; geen actieve taakuitvoerder voor andermans profiel.

Huidige stand op 2026-06-06:

- Ontwerp `docs/architecture/fase-4a-lijst-taakcreatie-ontwerp-v0.1.md` is GO.
- Voor 4B vereist bewijsbestand `supabase/tests/database/lijst_taakbeheer_rls.test.sql`
  is nog niet aanwezig.
- `npm.cmd run test:rls` faalt lokaal met:
  `failed to connect to postgres ... 127.0.0.1:54322 ... target machine actively refused it`.
- Daardoor is stap 4B formeel FIX tot lokaal/CI runtime hersteld is.

Niet doen bij het inhalen:

- Geen remote Supabase voor bewijs of mutaties.
- Geen actieve taakuitvoerder voor een ander profiel door beheer aanmaken.
- Geen persoonlijke lijst of persoonlijke taak in deze stap.
- Geen koppeling gebruiken die extra leesrecht geeft zonder aparte, bewezen helper.

GO pas wanneer:

- `npm.cmd run test:rls` draait met een groene
  `supabase/tests/database/lijst_taakbeheer_rls.test.sql`.
- Alleen systeembeheerder kan groepseigen lijsten en taken beheren in 4B.
- Andermans profiel kan niet met profieltoegang definitieve taakuitvoering instellen.
- 4B blijft binnen de bestaande persoonlijke/taakregie zonder doel/koppeling-veiligheidslekkage.

FIX wanneer:

- Docker/lokale Supabase niet beschikbaar is;
- `test:rls` zonder runtime of verbinding niet uitvoerbaar blijft;
- 4B zonder RLS-proof een breedere taken- of rechtenstroom probeert te introduceren.
