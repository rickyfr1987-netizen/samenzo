# SAM&ZO bouwplan v0.1

## 1. Doel van dit bouwplan

Dit document is het referentieplan voor de verdere ontwikkeling van de
SAM&ZO-app. Het ordent de huidige projectstatus, toetst de bouwrichting aan de
bronlijn en legt vast welke fases, testpoorten en Codex-opdrachten logisch zijn
voor het vervolg.

Dit plan bouwt geen nieuwe functionaliteit. Het bepaalt de volgorde waarin
volgende stappen veilig kunnen worden uitgevoerd.

Hoofddoel:

- Mijn dag blijft de persoonlijke werkelijkheid.
- Planning blijft de gemeenschappelijke werkelijkheid.
- Profiel blijft de functionele appwerkelijkheid; Persoon blijft account/actor.
- Persoonlijke regie wordt beschermd via eigen-profielacties of voorstellen.
- RLS, privacy en testbaarheid bepalen de bouwvolgorde.
- Categorieen sturen gedrag, maar worden geen rechtenlaag.

## 2. Bronnen en uitgevoerde toetsing

Gebruikte bronlijn:

- `docs/source/SAMZO UX Blauwdruk v1.1.docx`
- `docs/source/SAMZO Functionele Decompositie v0.3.docx`
- `docs/source/SAMZO Scherminventaris v0.2.docx`
- `docs/source/SAMZO Gebruikersflows v0.3.docx`
- `docs/source/SAMZO Conceptueel Datamodel v0.2.docx`
- `docs/source/SAMZO Rechtenmodel v0.3.docx`
- `docs/source/SAMZO Categoriecatalogus v0.3.docx`
- `docs/source/SAMZO MVP-scope v0.2.docx`
- `docs/source/SAMZO Projectplanning v0.2.docx`
- `docs/source/SAMZO Besluiten- en Begrippenblad v0.1.docx`
- `docs/architecture/SAMZO Supabase Logisch Schema V0.1.docx`
- `docs/architecture/SAMZO Rls Plan V0.1.docx`
- `docs/architecture/SAMZO Seeddata En Rls Testscenario S V0.1.docx`
- `docs/architecture/samzo_supabase_sql_migratie_v_0_2.sql`
- `docs/architecture/SAMZO_Codex_Bouwpakket_v1.1.docx`
- `docs/architecture/SAMZO_Codex_Start_en_Procesplan_v0.2.docx`
- `docs/functional/mijn-dag-compositie-v0.1.md`
- `docs/testing/test-strategy-v0.1.md`
- `docs/testing/browser-testdata-v0.1.md`
- `docs/audits/*.md`
- `app/`, `components/`, `domain/`, `hooks/`, `lib/`, `src/lib/`,
  `supabase/`, `tests/`

Belangrijkste bronbesluiten:

- De app is geen losse schermenset, maar een community-app rond relaties,
  contexten en persoonlijke regie.
- Mijn dag is persoonlijk en samengesteld uit persoonlijke relaties.
- Planning toont de gemeenschappelijke werkelijkheid binnen RLS-zichtbare
  context.
- Groepen zijn primair filter- en contextmechanisme.
- Eigenaarschap ligt bij precies een Profiel of een Groep.
- Profieltoegang mag kijken en begeleiden mogelijk maken, maar mag persoonlijke
  werkelijkheid niet stilzwijgend definitief vaststellen.
- Voorstellen beschermen persoonlijke regie.
- Gastenlogica blijft expliciet en beperkt.
- Begeleidingsnotities zijn geen Documenten en hebben geen categorie.
- Tags bepalen geen gedrag en geen rechten.
- Archiveren is standaard; verwijderen blijft uitzonderlijk.

## 3. Huidige projectstatus

### 3.1 Gebouwd en functioneel bruikbaar

| Onderdeel | Status | Bewijs in repo |
| --- | --- | --- |
| Next.js appstructuur | Gebouwd | Routes onder `app/`, gedeelde header, globale styling. |
| Supabase schema | Gebouwd | Migratieketen met tabellen, enums, indexes, seeddata en RLS. |
| RLS-basishulpfuncties | Gebouwd | `app_private.current_profiel_id`, `has_profieltoegang`, `can_view_moment`, `can_view_doel`, gastcontext. |
| Profielcontext/profielswitch | Gebouwd | `src/lib/samzo/current-context.ts`, header-tests, dev-profielcontext. |
| Mijn dag overzicht | Gebouwd, samengesteld | Deelnames, rollen, voorstellen, taken, document-attenties, doel-attenties, geaccepteerde doelen en profielgerichte aandacht. |
| Planning overzicht | Gebouwd | Datum-, categorie- en statusfilter, kaartlinks, RLS-zichtbare momenten. |
| Momentdetail | Gebouwd, deels muterend | Deelname, afmelden, voorstel beantwoorden, rol claimen/vrijgeven, begeleidingsnotitieblok. |
| Lijsten en taken | Gebouwd, deels muterend | Lijstenoverzicht/detail, taak claimen/vrijgeven/afvinken/heropenen. |
| Documenten leeslaag | Gebouwd | Overzicht/detail, koppelingen naar moment/lijst/doel, document-RLS leidend. |
| Doelen leeslaag | Gebouwd | Overzicht/detail, koppelingen; geaccepteerde doelen in Mijn dag. |
| Doelacceptatie-acties | Gebouwd | `beantwoord_doelacceptatie` RPC, helper en Mijn dag-knoppen voor eigen profiel. |
| Tijdlijn/support | Gebouwd | Tijdlijn combineert berichten, signalen, voorstellen en supportvragen; supportreacties en sluitstappen bestaan. |
| Begeleidingsnotities | Gebouwd, privacygevoelig | Moment- en lijstdetailblokken, create/update/archive helpers, RLS-tests. |
| Gasttoegang | Gebouwd en getest | Gastcontext in RLS, unit/integratietests en pgTAP-cases. |
| Snelle testbasis | Gebouwd | Vitest, Testing Library, unit- en integratietests. |
| RLS-testbasis | Gebouwd | pgTAP-bestanden in `supabase/tests/database/`. |
| RLS-CI route | Gebouwd, branchspecifiek | `.github/workflows/samzo-rls-ci.yml` draait op `fase-1b-ci-rls-proof`. |

### 3.2 Deels gebouwd

| Onderdeel | Wat werkt | Wat ontbreekt |
| --- | --- | --- |
| Mijn dag als startplek | Samengestelde persoonlijke kaarten en enkele acties | Persoonlijk moment aanmaken, persoonlijke taak aanmaken, generieke aandacht afhandelen, brede browserflow. |
| Planning | Lezen/filteren/detailnavigatie | Momentcreatie, momentbeheer, volledige capaciteits-/conflictflow. |
| Momenten | Deelname, afmelden, voorstellen, rollen | Nieuwe momenten beheren, categoriegestuurd formulier, begeleider-naar-client persoonlijk moment als voorstel. |
| Rollen en capaciteit | Claim/vrijgave en beperkte guards | Volledige beheerflow voor rolconfiguratie per categorie en capaciteitsbeleid. |
| Lijsten/taken | Read/write op taakuitvoerderschap en taakstatus | Lijstcreatie, taakcreatie, taakvoorstellen, taakoverdracht als voorstel. |
| Documenten | Informeren en veilig openen | Documentcreatie, publicatiebeheer, review/vervanging, document onder aandacht beheren. |
| Doelen | Lezen, doel-attenties, acceptatieacties | Doelcreatie, doelbeheer, voortgang, bredere doelvoorstellen, rapportage. |
| Tijdlijn | Berichten/signalen/support/voorstellen zichtbaar | Read-state/notificatiestatus als echte workflow, archief/historiek. |
| Supportvragen | Lichte support via Tijdlijn | Volledige levenscyclus-audit, browserflow, geen ticketmodule. |
| Beheer | Dev-login, health, simpele beheerpagina | Productiebeheer voor personen, profielen, groepen, categorieen, momenten, lijsten, documenten, doelen. |
| Categoriegedrag | Schema, defaults en filters | Gedrag sturend formulier-/actie-/rol-/statusmodel in UI. |
| Beschikbaarheid | Schema en enum aanwezig | Geen echte UI/flow voor beschikbaar/niet-beschikbaar. |
| Playwright | Auth-smoke voorbereid | Brede browserregressies en resetbare browserdata ontbreken. |

### 3.3 Alleen in documentatie of specificatie

| Onderdeel | Huidige status |
| --- | --- |
| Exact modern visueel design | Later; nu ligt focus op functie, data, rechten en testbaarheid. |
| Volledige categoriegedragslaag | Functioneel beschreven, technisch nog beperkt gebruikt. |
| Productiebeheerflows | Beschreven, maar grotendeels niet gebouwd. |
| Persoonlijke taak direct vanuit Mijn dag | Uitgesteld tot lijst-/taakstrategie gekozen is. |
| Persoonlijk aandachtspunt | Geen aparte entiteit; voorlopig compositie van bronnen. |
| Voorstellen voor taak/doel/document/persoonlijk moment | Enum voorbereid, flows niet breed gebouwd. |
| Begeleider-naar-client persoonlijk moment | Moet voorstelgestuurd worden, nog geen flow. |
| Beschikbaarheid/niet-beschikbaarheid | Schema aanwezig, productflow niet gebouwd. |
| Kioskmodus, week-/maandplanning, complexe reserveringen | Buiten MVP-kern of later. |

### 3.4 Geparkeerd

| Onderdeel | Reden |
| --- | --- |
| Fase 2 Stap 2O-b: eigen persoonlijk moment aanmaken | RLS/pgTAP-debugloop rond muterende persoonlijke momenten was niet stabiel genoeg. |
| Directe persoonlijke plusknop | Mag pas na groene RLS-first mutatieroute. |
| Directe client-mutaties door begeleider/medewerker | Botst met persoonlijke regie; moet voorstelgestuurd blijven. |
| Remote Supabase als testbasis | Huidige bewijsroute hoort lokaal/CI te blijven zonder secrets. |

## 4. Bouwprincipes

1. Bouw vanuit documenten, niet vanuit losse schermwensen.
2. Maak persoonlijke werkelijkheid alleen definitief door het eigen actieve
   profiel of via expliciete acceptatie.
3. Gebruik RLS en RPC/server actions als beslissende beveiligingslaag; UI-gating
   is aanvullend.
4. Gebruik categorieen voor gedrag, labels, velden en defaults, maar niet voor
   rechten of privacy.
5. Laat gekoppelde items geen extra leesrecht geven.
6. Voeg mutaties pas toe wanneer testdata resetbaar is en negatieve RLS-cases
   bestaan.
7. Bouw eerst smalle verticale flows, daarna beheer en visuele verfijning.
8. Houd support licht via Tijdlijn; geen ticketmodule of chatlaag in MVP.
9. Gebruik geen service-role in frontend, tests of gewone gebruikersflows.
10. Bewaar geen wachtwoorden, tokens of echte persoonsgegevens in repo, docs,
    testtraces of CI-artifacts.

## 5. Model- en reasoningstrategie

Gebruik altijd het lichtste model dat verantwoord is.

| Werksoort | Model | Reasoning | Gebruik |
| --- | --- | --- | --- |
| Architectuur, datamodel, rechtenmodel, RLS, policies, migraties, RPC-ontwerp, privacy, audits, bouwvolgorde | GPT-5.5 | Extra Hoog | Voor besluiten die meerdere domeinen of privacy raken. |
| Nieuwe RLS/RPC's, complexe rechtenlogica, query-architectuur, domeinoverstijgende wijzigingen | GPT-5.5 | Hoog | Voor smalle maar privacykritische implementatiekeuzes. |
| Beperkte RLS/RPC-aanpassing, gerichte analyses, complexe bugonderzoeken | GPT-5.5 | Middel | Voor debugging of toetsing met beperkte scope. |
| Grote implementaties van reeds ontworpen oplossingen met veel bestanden of testscenario's | GPT-5.3 Spark | Extra Hoog | Voor uitvoering na expliciet ontwerp en GO. |
| Normale featurebouw, UI, server actions, integratietests, componenten, helpers | GPT-5.3 Spark | Hoog | Voor bouwstappen met duidelijke acceptatiecriteria. |
| Documentatie, kleine fixes, testupdates, tekst- en UI-correcties | GPT-5.3 Spark | Middel | Voor kleine, laag-risico onderhoudsstappen. |

Escalatieregel:

- Zodra een stap RLS, privacy, eigenaarschap, profielcontext of voorstelstatus
  verandert, start eerst een GPT-5.5 analyse- of ontwerpstap.
- Pas daarna voert GPT-5.3 Spark de ontworpen implementatie uit.

## 6. Faseoverzicht

| Fase | Naam | Doel |
| --- | --- | --- |
| 0 | Stabilisatie en bewijsroute | Bouwplan vastleggen, branch/CI-route gezond maken en testpoorten betrouwbaar krijgen. |
| 1 | Testdata, RLS en browserbasis | RLS/pgTAP, resetdata en Playwright-smoke als reproduceerbare basis afronden. |
| 2 | Mijn dag hardenen zonder nieuwe persoonlijke mutatie | Persoonlijke compositie en bestaande acties stabiliseren, 2O-b geparkeerd houden. |
| 3 | Planning en momentbeheer MVP-smal | Gemeenschappelijke werkelijkheid uitbreiden met veilige momentbeheerroute. |
| 4 | Lijsten en taken naar werkbare flow | Lijsten/taken minder seed-afhankelijk maken met veilige create/manage-flow. |
| 5 | Tijdlijn, support en begeleidingsnotities afronden | Aandacht, lichte support en privacygevoelige notities afronden en auditen. |
| 6 | Documenten en doelen beheerbaar maken | Informatieve documenten en lichte doelenflow uitbreiden zonder dossier/rapportage. |
| 7 | Categoriegedrag MVP-light | Categorieen laten sturen op zichtbaar gedrag zonder rechtenlaag te worden. |
| 8 | Personen, groepen en beheerbasis | Productiebeheer voor identiteiten, profielen, groepen en toegangen veilig maken. |
| 9 | MVP-eindaudit en pilotvoorbereiding | Projectbreed toetsen, browserflows draaien en pilot-GO/FIX beslissen. |

## 7. Uitgewerkte fases

### Fase 0: Stabilisatie en bewijsroute

Doel:

- Een stabiele referentiebasis hebben na het parkeren van 2O-b.
- Dit bouwplan als leidend document vastleggen.
- Voorkomen dat nieuwe branches buiten de RLS-CI-bewijsroute vallen.

Waarom nu:

- De branch is teruggezet naar de groene basis rond `07d0b61` met docsnotitie.
- De workflow triggert nu alleen voor `fase-1b-ci-rls-proof`, terwijl de
  stabiele branch `fase-2-personal-items-green-base` heet.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 0A | GPT-5.3 Spark Middel | Commit en push dit bouwplan, zonder productcode. | `npm run lint`, `npm run typecheck`, documentcontroles. |
| 0B | GPT-5.5 Middel | Analyseer of de RLS-CI workflow branchbreed of PR-breed gemaakt moet worden. | Geen RLS-wijziging; workflowdiff + risicoanalyse. |
| 0C | GPT-5.3 Spark Middel | Pas alleen workflow-trigger aan als 0B GO geeft. | Typecheck/lint/test en CI-run op stabiele branch of PR. |

Bewust niet meenemen:

- Geen nieuwe RLS-policy.
- Geen RPC.
- Geen UI.
- Geen hervatting van 2O-b.

Risico's:

- Zonder CI-run op de stabiele branch is RLS-bewijs niet automatisch zichtbaar.
- Een te brede workflowtrigger kan onnodige CI-kosten geven, maar dat is minder
  riskant dan onbewust zonder RLS-bewijs bouwen.

Eindtest/audit:

- Mini-audit "Stabiele basis en CI-bewijsroute".

GO:

- Bouwplan staat in repo.
- Typecheck, lint en unit/integratie-tests zijn groen.
- Er is een duidelijke CI-route voor de stabiele vervolgbranch.

FIX:

- Workflow draait niet of draait op verkeerde branch.
- Documenten spreken elkaar tegen over 2O-b.
- Er zijn productcodewijzigingen in deze fase.

### Fase 1: Testdata, RLS en browserbasis

Doel:

- De testpoorten zo betrouwbaar maken dat latere featurebouw niet afhankelijk is
  van handmatige checks.
- RLS/pgTAP en browser-smoke als vaste poort gebruiken.

Waarom nu:

- RLS is de echte privacylaag.
- Browserflows muteren data; zonder resetstrategie worden tests instabiel.
- Lokale Docker/WSL2 is historisch onzeker, dus GitHub Actions blijft belangrijk.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 1A | GPT-5.5 Hoog | Audit huidige pgTAP-suites, plans, testdata-idempotentie en branch-CI. | Alleen analyse, geen fix. |
| 1B | GPT-5.3 Spark Hoog | Herstel alleen testdocumentatie en workflow/logging als analyse dat aanwijst. | `npm run typecheck`, `npm run lint`, `npm run test`, CI. |
| 1C | GPT-5.5 Extra Hoog | Ontwerp resetbare browserdata voor voorstel, support, taak, rol, gast en Mijn dag. | Geen migratie tot GO. |
| 1D | GPT-5.3 Spark Extra Hoog | Implementeer resetdata/testfixtures volgens 1C. | Vitest, `npm run test:rls`, Playwright-smoke. |
| 1E | GPT-5.5 Hoog | Mini-audit RLS-testbasis en resetbare browserdata. | Auditdocument + GO/FIX. |

Bewust niet meenemen:

- Geen nieuwe productfeatures.
- Geen persoonlijke moment-mutatie.
- Geen brede beheerflows.

Risico's:

- pgTAP-fouten kunnen onduidelijk worden als CI-logwrapper ontbreekt.
- Seeddata kan conflicteren met rollback-testdata.
- Browsercredentials mogen nooit in repo belanden.

Eindtest/audit:

- `docs/audits/rls-testbasis-browserdata-v0.1.md`.

GO:

- `npm run typecheck`, `npm run lint`, `npm run test` groen.
- `npm run test:rls` groen in CI.
- Minimaal een Playwright-auth-smoke is uitvoerbaar of expliciet runtime
  overgeslagen zonder geheimen te loggen.
- Resetstrategie is gedocumenteerd.

FIX:

- RLS-tests rood zonder echte foutregel.
- Browserflow is volgorde-afhankelijk.
- Wachtwoorden/tokens staan in repo, docs of artifacts.

### Fase 2: Mijn dag hardenen zonder nieuwe persoonlijke mutatie

Doel:

- Mijn dag als persoonlijke startplek stabiel maken met bestaande
  compositiebronnen en bestaande veilige acties.
- Directe persoonlijke mutaties blijven geparkeerd totdat RLS-first ontwerp
  opnieuw veilig is.

Waarom nu:

- Mijn dag is de startplek en toont al veel bronnen.
- De grootste recente blokkade zat in muterende persoonlijke momenten; daarom
  bouwen we eerst veilige niet-RLS-kritische verbeteringen en tests.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 2A | GPT-5.5 Hoog | Audit Mijn dag-compositie tegen bronregels en huidige queryhelpers. | Analyse, geen code. |
| 2B | GPT-5.3 Spark Hoog | Verbeter alleen UI-states, sortering, labels en foutmeldingen rond bestaande items. | Unit + integration tests. |
| 2C | GPT-5.3 Spark Hoog | Voeg browser-smoke toe voor Mijn dag laden, datumwissel, profielwissel en doelacceptatieactie. | Playwright met resetdata. |
| 2D | GPT-5.5 Extra Hoog | Herontwerp 2O-b pas later: eigen persoonlijk moment aanmaken RLS-first. | Alleen ontwerp/RLS-keuze, geen build. |
| 2E | GPT-5.3 Spark Extra Hoog | Bouw 2O-b alleen na GO op 2D en groene pgTAP-pilot. | pgTAP, unit, integration, CI. |

Bewust niet meenemen:

- Geen plusknop in 2A-2C.
- Geen persoonlijke taak of aandachtspunt.
- Geen begeleider-naar-client definitieve mutatie.
- Geen categoriegedreven Mijn dag-rechten.

Risico's:

- Mijn dag kan gevoelige gekoppelde iteminformatie lekken als document/doel-RLS
  niet zelfstandig leidend blijft.
- Actieknoppen mogen niet in andermans profielperspectief verschijnen.
- Persoonlijk moment aanmaken blijft privacykritisch en is geparkeerd.

Eindtest/audit:

- Mini-audit "Mijn dag persoonlijke werkelijkheid v0.1".

GO:

- Bestaande Mijn dag-bronnen blijven zichtbaar volgens RLS.
- Geen nieuwe muterende persoonlijke flow zonder RLS-bewijs.
- Browser-smoke is groen of expliciet gemotiveerd uitgesteld.

FIX:

- Andermans profielperspectief krijgt actieknoppen.
- Gekoppelde documenten/doelen lekken via attentiekaart.
- 2O-b wordt toch via directe clientinsert of categorie-rechten gebouwd.

### Fase 3: Planning en momentbeheer MVP-smal

Doel:

- Planning van leesbare gemeenschappelijke werkelijkheid naar eerste veilige
  beheerbare momentflow brengen.

Waarom nu:

- Planning is de plek waar gezamenlijke activiteiten, diensten en momenten
  ontstaan.
- Veel Mijn dag-items hangen af van momenten, deelnames, rollen en voorstellen.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 3A | GPT-5.5 Extra Hoog | Ontwerp smalle momentcreatie/beheerflow: eigenaar, groep, categorie, capaciteit, gasttoegang, status. | Analyse + RLS-testplan. |
| 3B | GPT-5.5 Hoog | Ontwerp RLS/RPC/server-actionroute voor momentbeheer. | pgTAP-specificatie, geen UI. |
| 3C | GPT-5.3 Spark Extra Hoog | Bouw momentcreate/edit/archive volgens 3A/3B. | pgTAP, unit, integration. |
| 3D | GPT-5.3 Spark Hoog | Sluit UI aan in Planning/detail met rustige mobile-first flow. | Integration + Playwright. |
| 3E | GPT-5.5 Hoog | Audit Planning/Momenten MVP-smal. | Audit + GO/FIX. |

Bewust niet meenemen:

- Geen week-/maandplanner.
- Geen complexe reserveringsconflicten.
- Geen stille mutaties vanaf kaart zonder confirmatie.
- Geen categorieen als rechtenlaag.

Risico's:

- Momentcreatie raakt groepzichtbaarheid, gasttoegang, capaciteit, rollen en
  Mijn dag tegelijk.
- Statussen `concept`, `gepland`, `open`, `vol`, `geannuleerd`,
  `gearchiveerd` moeten consistent blijven.

Eindtest/audit:

- Fase-audit "Planning en momenten".

GO:

- Systeembeheerder/toegestane beheercontext kan moment maken volgens ontwerp.
- Gewone gebruikers kunnen niet buiten hun rechten beheren.
- Deelname/rol/Mijn dag-regressies blijven groen.

FIX:

- Momentbeheer opent persoonlijke of groepdata te breed.
- Capaciteit/rolclaims raken inconsistent.
- Gasten zien interne momenten.

### Fase 4: Lijsten en taken naar werkbare flow

Doel:

- Lijsten en taken minder seed-afhankelijk maken en veilig uitvoerbaar houden.

Waarom nu:

- Taken zijn al zichtbaar en mutaties op taakuitvoerder/status bestaan.
- Create/manage ontbreekt nog, waardoor praktijkgebruik beperkt blijft.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 4A | GPT-5.5 Hoog | Ontwerp lijst-/taakcreatie: eigenaar-profiel/groep, gekoppeld moment/doel, taakuitvoerders. | Analyse + RLS-testplan. |
| 4B | GPT-5.3 Spark Extra Hoog | Bouw smalle lijstcreate/edit/archive en taakcreate/edit-flow. | Unit, integration, pgTAP waar RLS wijzigt. |
| 4C | GPT-5.5 Hoog | Ontwerp taakvoorstellen/overdracht als persoonlijke regieflow. | Geen bouw zonder GO. |
| 4D | GPT-5.3 Spark Hoog | Bouw alleen gekozen taakvoorstelroute. | pgTAP + componenttests. |
| 4E | GPT-5.5 Hoog | Audit Lijsten/Taken. | Audit + browserflow. |

Bewust niet meenemen:

- Geen generieke projectmanagementmodule.
- Geen persoonlijke taak direct vanuit Mijn dag totdat datamodel gekozen is.
- Geen vrij formulierensysteem.

Risico's:

- Lijstzichtbaarheid kan taakzichtbaarheid te breed maken.
- Taakuitvoerderschap is persoonlijke werkelijkheid en mag niet namens een ander
  profiel definitief worden gezet zonder voorstelroute.

Eindtest/audit:

- Fase-audit "Lijsten en taken".

GO:

- Lijsten en taken kunnen veilig worden aangemaakt/beheerd.
- Taakmutaties blijven eigen-profiel of expliciet voorstelgestuurd.
- Mijn dag toont alleen eigen actieve taken.

FIX:

- Andermans taak verschijnt door lijstcontext alleen.
- Profieltoegang kan definitieve taakwerkelijkheid maken zonder acceptatie.

### Fase 5: Tijdlijn, support en begeleidingsnotities afronden

Doel:

- Aandacht, lichte support en privacygevoelige notities volwassen genoeg maken
  voor MVP-gebruik.

Waarom nu:

- Deze onderdelen bestaan al, maar hebben volledige levenscyclus- en
  browserbewijs nodig.
- Begeleidingsnotities zijn privacykritisch.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 5A | GPT-5.5 Hoog | Audit Tijdlijn/support/notities tegen rechtenmodel en MVP-scope. | Analyse. |
| 5B | GPT-5.3 Spark Hoog | Harden supportreactie/sluitflow en UI-states. | Integration + unit. |
| 5C | GPT-5.5 Hoog | Ontwerp notificatiestatus/read-state MVP-light. | Analyse + datamodelkeuze. |
| 5D | GPT-5.3 Spark Extra Hoog | Bouw read-state alleen na GO 5C. | Migration/RLS indien nodig, integration, Playwright. |
| 5E | GPT-5.5 Hoog | Audit privacy begeleidingsnotities en support. | pgTAP + audit. |

Bewust niet meenemen:

- Geen chat.
- Geen ticketmodule.
- Geen algemene notitiesmodule.
- Geen begeleidingsnotities in Documenten.

Risico's:

- Tijdlijn kan een aandachtstroom zonder duidelijke afhandeling blijven.
- Begeleidingsnotities mogen niet lekken naar bewoners/gasten buiten expliciete
  context.

Eindtest/audit:

- Fase-audit "Tijdlijn, support en begeleidingsnotities".

GO:

- Support heeft reproduceerbare browserflow.
- Begeleidingsnotities blijven contextgebonden en niet-documentair.
- Geen nieuwe privacy-lekken via Tijdlijnkoppelingen.

FIX:

- Notities zichtbaar voor verkeerde profiel/rol.
- Supportacties beschikbaar in bekeken-andermans-profielcontext.

### Fase 6: Documenten en doelen beheerbaar maken

Doel:

- Documenten en doelen van read-only/seedgedreven naar lichte beheerbare MVP-flow
  brengen zonder dossier- of rapportagelogica.

Waarom nu:

- Documenten informeren en doelen geven richting, maar brede creatie/beheerflow
  ontbreekt.
- Doelacceptaties zijn al als persoonlijke regieflow aanwezig.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 6A | GPT-5.5 Hoog | Ontwerp documentbeheer: eigenaar, publicatie, groep/context, vervanging, archief. | RLS-testplan. |
| 6B | GPT-5.3 Spark Extra Hoog | Bouw smalle documentbeheerflow. | pgTAP, integration, Playwright. |
| 6C | GPT-5.5 Hoog | Ontwerp doelbeheer: eigenaar, doelperiode, koppelingen, aandacht/acceptatie. | RLS/testplan. |
| 6D | GPT-5.3 Spark Extra Hoog | Bouw smalle doelcreate/edit/archive en koppelbeheer. | pgTAP, unit, integration. |
| 6E | GPT-5.5 Hoog | Audit documenten en doelen. | Fase-audit. |

Bewust niet meenemen:

- Geen persoonlijke documentenbibliotheek.
- Geen zorgdossier.
- Geen rapportageomgeving.
- Geen subdoelen of complexe voortgangsmetingen in MVP.

Risico's:

- Documentattentie mag verboden documentinhoud niet lekken.
- Doelacceptatie mag verborgen doelen niet openen.
- Documenten en begeleidingsnotities mogen niet samenvallen.

Eindtest/audit:

- Fase-audit "Documenten en doelen".

GO:

- Documentbeheer respecteert groep/context en publicatiestatus.
- Doelbeheer respecteert eigenaar en doel-RLS.
- Mijn dag attenties blijven veilig.

FIX:

- Gekoppelde items geven ongewenst leesrecht.
- Begeleidingsinformatie belandt in documentflow.

### Fase 7: Categoriegedrag MVP-light

Doel:

- Categorieen beperkt maar echt gedrag laten sturen, zonder dat zij rechten
  bepalen.

Waarom nu:

- Categorieen zijn een kernprincipe uit de bronlijn, maar sturen nu nog weinig
  productgedrag.
- Eerst moeten de basisflows stabiel zijn, anders wordt categoriegedrag te breed.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 7A | GPT-5.5 Extra Hoog | Ontwerp categoriegedrag-MVP: welke velden, acties, statuslabels en rollen worden gestuurd. | Analyse + acceptatiecriteria. |
| 7B | GPT-5.3 Spark Hoog | Bouw categorieconfig-helper en mappingtests. | Unit tests. |
| 7C | GPT-5.3 Spark Extra Hoog | Sluit categoriegedrag aan op moment/lijst/document/doel waar schema-safe. | Integration + Playwright. |
| 7D | GPT-5.5 Hoog | Audit categoriegedrag. | Audit + regressies. |

Bewust niet meenemen:

- Geen vrij formulierensysteem.
- Geen RLS op basis van categorie.
- Geen automatische migratie van bestaande items bij categoriewijziging.

Risico's:

- Categorieen kunnen per ongeluk als verborgen rechtenmodel gebruikt worden.
- Te veel configuratie maakt de MVP moeilijk testbaar.

Eindtest/audit:

- Mini-audit "Categoriegedrag MVP-light".

GO:

- Categorieen sturen zichtbaar gedrag.
- Rechten blijven onafhankelijk bewezen via RLS.
- Tags blijven alleen vindbaarheid/filter.

FIX:

- Categorie bepaalt toegang of privacy.
- Config veroorzaakt ontestbare formulierlogica.

### Fase 8: Personen, groepen en beheerbasis

Doel:

- De app productieachtiger maken door basisbeheer veilig uit te werken.

Waarom nu:

- De app is anders te afhankelijk van seeddata.
- Personen, profielen, groepen en toegangen zijn fundament voor alle modules.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 8A | GPT-5.5 Extra Hoog | Ontwerp beheerbasis: personen, profielen, profieltoegang, groepen, lidmaatschap. | RLS/testplan. |
| 8B | GPT-5.3 Spark Extra Hoog | Bouw minimale beheer-UI en helpers. | pgTAP, integration, Playwright. |
| 8C | GPT-5.5 Hoog | Ontwerp systeemondersteuner versus systeembeheerder grenzen. | Analyse. |
| 8D | GPT-5.3 Spark Hoog | Bouw eventuele supportbeheer-acties volgens 8C. | Unit/integration/pgTAP. |
| 8E | GPT-5.5 Hoog | Audit beheerbasis. | Fase-audit. |

Bewust niet meenemen:

- Geen open self-service registratie zonder apart auth-ontwerp.
- Geen beheerrechten als bypass voor persoonlijke regie.
- Geen echte persoonsgegevens in seed/tests.

Risico's:

- Systeembeheerder mag structureel beheren, maar persoonlijke keuzes niet
  overrulen.
- Profieltoegang is kijk-/begeleidingsruimte, geen definitieve mutatieregel.

Eindtest/audit:

- Fase-audit "Personen, groepen en beheer".

GO:

- Beheer kan kerninrichting aanpassen zonder privacygrenzen te doorbreken.
- Systeemrollen zijn duidelijk in UI en RLS.
- Profieltoegang blijft voorstel-/eigen-profielveilig.

FIX:

- Beheercontext kan persoonlijke werkelijkheid definitief maken zonder
  acceptatie.
- Gast of lid krijgt interne beheerdata.

### Fase 9: MVP-eindaudit en pilotvoorbereiding

Doel:

- Vaststellen of SAM&ZO als eerste werkbare MVP veilig genoeg is voor pilot.

Waarom nu:

- Pas na stabiele kernflows, RLS-bewijs, browserflows en beheerbasis is een
  brede audit zinvol.

Stappen:

| Stap | Model | Opdracht | Tests |
| --- | --- | --- | --- |
| 9A | GPT-5.5 Extra Hoog | Projectbrede functionele audit tegen bronlijn. | Auditmatrix. |
| 9B | GPT-5.5 Extra Hoog | Projectbrede security/privacy/RLS-audit. | pgTAP + schema/policy review. |
| 9C | GPT-5.3 Spark Extra Hoog | Draai en herstel alleen auditbevindingen met GO. | Alle testpoorten. |
| 9D | GPT-5.5 Hoog | Pilot-GO/FIX besluitdocument. | Eindrapport. |

Bewust niet meenemen:

- Geen nieuwe features tijdens audit.
- Geen scope-uitbreiding buiten MVP.
- Geen visuele redesignsprong zonder aparte UX-stap.

Risico's:

- Losse kleine fixes kunnen auditfocus vertroebelen.
- Nieuwe wensen moeten eerst langs MVP-scope en privacy.

Eindtest/audit:

- Projectbrede MVP-audit.

GO:

- Alle functionele kernflows passen bij bronlijn.
- Typecheck/lint/Vitest/pgTAP/Playwright relevante set groen.
- Open risico's zijn niet blokkerend of expliciet geparkeerd.

FIX:

- Privacy/RLS-gat.
- Onstabiele browserflow in kernroute.
- Bronconflict zonder besluit.

## 8. Teststrategie en testpoorten

### 8.1 Testlagen

| Laag | Wanneer verplicht | Voorbeelden |
| --- | --- | --- |
| Unit tests | Helpers, mapping, statusovergangen, foutmapping | Mijn dag itemcompositie, doelacceptatie-helper, categorieconfig-helper. |
| Component-/integratietests | UI toont/activeert bestaande flows | Mijn dag, Planning, Tijdlijn, detailpagina's, profielswitch. |
| pgTAP/RLS | RLS, policies, RPC's, privacygevoelige queries | Voorstellen, doelacceptaties, persoonlijke momenten, support, notities. |
| Playwright | Echte browserflows met auth/profielcontext | Login smoke, Mijn dag, voorstelactie, supportflow, beheerflow. |
| Fase-audit | Na elke grotere fase | GO/FIX-document met status, risico's en testresultaten. |
| Projectbrede audit | Einde MVP-traject | Functioneel, privacy, RLS, UX en testbaarheid samen. |

### 8.2 Algemene GO-criteria per stap

Een stap is GO wanneer:

- De wijziging klopt met de bronlijn.
- De relevante testlaag is uitgevoerd.
- RLS/pgTAP is uitgevoerd bij rechten, policies, RPC's en privacygevoelige
  queries.
- Browserflow is getest wanneer de gebruiker de echte route doorloopt.
- Bekende risico's zijn benoemd.
- Er geen open blokkerende punten zijn.
- Geen secrets, wachtwoorden of echte persoonsgegevens zijn toegevoegd.

### 8.3 Algemene FIX-criteria per stap

Een stap is FIX wanneer:

- Een bronbesluit wordt tegengesproken.
- Een RLS/privacygrens niet bewezen is.
- Een actie namens een ander profiel definitieve persoonlijke werkelijkheid
  maakt zonder voorstel/acceptatie.
- Testdata niet resetbaar is voor muterende browserflow.
- CI of lokale checks rood zijn zonder expliciete, niet-blokkerende reden.
- Er productcode is gewijzigd in een analyse-only stap.

## 9. Aanpak voor vervolgprompts

Elke vervolgprompt hoort deze vaste onderdelen te bevatten:

1. Model en reasoningniveau.
2. Korte reden voor modelkeuze.
3. Exact doel.
4. Context en laatste relevante branch/commit.
5. Minimaal te lezen bestanden.
6. Wat wel bouwen.
7. Wat niet bouwen.
8. RLS/privacyregels.
9. Testinstructies.
10. Stopcondities.
11. Compacte output met GO/FIX.

Gebruik dit patroon:

```text
Model: <model>
Reasoning: <niveau>
Korte reden: <waarom dit model licht genoeg maar veilig is>

Doel:
<concrete stap>

Context:
<branch, commit, relevante docs>

Lees minimaal:
<docs en codepaden>

Bouw alleen:
<scope>

Niet doen:
<anti-scope>

Tests:
<typecheck/lint/test/rls/playwright/audit>

Stop en rapporteer als:
<privacy/RLS/schema/brede scope blokkers>

Output:
Status GO/FIX, bestanden, tests, risico's, vervolgadvies.
```

## 10. Open vragen en risico's

| Risico/vraag | Impact | Advies |
| --- | --- | --- |
| RLS-CI triggert alleen op `fase-1b-ci-rls-proof` | Nieuwe stabiele branch krijgt niet vanzelf RLS-bewijs | Eerst workflowtrigger/PR-route analyseren. |
| 2O-b persoonlijke moment-mutatie is geparkeerd | Mijn dag blijft zonder directe eigen persoonlijke afspraakflow | Pas terugpakken met GPT-5.5 Extra Hoog en smalle RLS-pilot. |
| Lokale Docker/WSL2 was onzeker | Lokale `npm run test:rls` kan niet altijd leidend zijn | GitHub Actions als objectieve runtime blijven gebruiken. |
| Categoriegedrag is nog weinig zichtbaar | Kernprincipe uit docs blijft onderbenut | Na kernflows gefaseerd MVP-light bouwen. |
| Beheerflows ontbreken | App blijft seed-afhankelijk | Eerst testbasis, daarna smalle beheerbasis. |
| Gekoppelde items kunnen privacy lekken | Documenten/doelen/momenten mogen geen leesrecht erven via aandacht | Elke attentie/koppeling met zelfstandige RLS-test blijven bewijzen. |
| Profieltoegang versus eigen profiel | Begeleiders mogen niet definitief namens client handelen | Elke mutatie moet eigen-profiel of voorstelgestuurd zijn. |
| Gastenlogica | Gasttoegang mag niet breed worden | Gastcases in RLS en Playwright houden. |
| Support blijft licht | Risico dat het toch ticket/chat wordt | Scope bewaken: Tijdlijn-support, geen ticketmodule. |
| Exact design later | UX kan functioneel werken maar nog niet visueel eindwaardig zijn | Visuele polish plannen na stabiele flows. |

## 11. Advies voor eerstvolgende stap

Advies:

- Start met Fase 0B: analyseer en herstel de CI-bewijsroute voor de stabiele
  vervolgbranch.

Waarom:

- Zonder RLS-CI op de vervolgbranch hebben we geen betrouwbare poort voor latere
  RLS- of privacygevoelige stappen.
- Dit is klein, niet-productmatig en voorkomt dat we opnieuw handmatig moeten
  zoeken naar onzichtbare pgTAP-fouten.
- 2O-b blijft geparkeerd.

Aanbevolen model:

- GPT-5.5

Reasoning:

- Middel

Korte reden:

- Het is geen productfeature, maar raakt CI-bewijsroute, RLS-testpoort en
  branchstrategie. Een korte analyse voorkomt een te brede workflowwijziging.

## 12. Eerste vervolgprompt

```text
Model: GPT-5.5
Reasoning: Middel
Korte reden: Deze stap raakt geen productfunctionaliteit, maar wel de
RLS-bewijsroute en branchstrategie. Eerst analyseren voorkomt onnodig brede
workflowwijzigingen.

Doel:
Analyseer hoe `SAM&ZO RLS CI` betrouwbaar moet draaien voor de stabiele
vervolgbranch na het parkeren van 2O-b.

Context:
- Huidige stabiele branch: `fase-2-personal-items-green-base`
- 2O-b is geparkeerd.
- Geen nieuwe RLS-policy, RPC, UI of productfeature bouwen.
- Workflowbestand: `.github/workflows/samzo-rls-ci.yml`
- Bouwplan: `docs/planning/samzo-bouwplan-v0.1.md`

Lees minimaal:
- `.github/workflows/samzo-rls-ci.yml`
- `docs/testing/test-strategy-v0.1.md`
- `docs/audits/fase-1-rls-bewijsmatrix-v0.1.md`
- `tests/rls/README.md`
- `supabase/tests/README.md`
- `package.json`

Analyseer:
1. Op welke branches/triggers draait de workflow nu?
2. Waarom draait de stabiele vervolgbranch nu wel/niet automatisch mee?
3. Wat is de kleinste veilige triggerwijziging?
4. Moet dit via push-branches, pull_request-branches of alleen
   workflow_dispatch?
5. Welke secrets/logging-risico's zijn er?

Niet doen:
- Geen productcode wijzigen.
- Geen RLS-policy wijzigen.
- Geen migratie wijzigen.
- Geen RPC of helper bouwen.
- Geen UI bouwen.
- Geen 2O-b hervatten.

Output:
1. Status: GO/FIX
2. Gelezen bestanden
3. Huidige workflowtrigger
4. Advies triggerwijziging
5. Risico's
6. Exacte implementatieprompt voor GPT-5.3 Spark Middel
7. Vraag of ik die prompt wil laten uitvoeren
```

