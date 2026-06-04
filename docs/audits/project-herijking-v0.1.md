# SAM&ZO project-herijking v0.1

## 1. Samenvatting

De oorspronkelijke slicevolgorde is ingehaald door de praktijk. SAM&ZO heeft nu een werkende technische en functionele kern: Supabase-schema, RLS, profielcontext, profielswitch, Mijn dag, Planning, Momentdetail, voorstellen, rollen, lijsten/taken, documenten, doelen, Tijdlijn/support, gasttoegang, testbasis en een eerste begeleidingsnotitie-UI in detailcontext.

De app is daarmee geen vroege skeleton-app meer. De volgende waarde zit niet in "nog een scherm erbij", maar in herijken, testdata realistischer maken, RLS automatisch testen en daarna pas gericht verder bouwen.

Belangrijkste conclusie:

| Thema | Status |
| --- | --- |
| Functionele kern | Breed aanwezig en deels functioneel bruikbaar. |
| Grootste technische risico | RLS is leidend maar nog niet automatisch getest. |
| Grootste functionele risico | Categoriegedrag is voorbereid, maar stuurt de app nog nauwelijks. |
| Grootste UX-risico | Sommige modules zijn leesbaar/bruikbaar, maar creatie- en beheerflows ontbreken of zijn alleen via seeddata te testen. |
| Grootste testdata-risico | Browserflows zijn afhankelijk van mutable development data zonder brede resetstrategie per scenario. |
| Aanbevolen koers | Eerst testdata/RLS/browserbasis versterken, daarna Blok 6 afronden/auditen, daarna categoriegedrag en beheerflows. |

Werkboom-opmerking: tijdens deze herijking waren er al uncommitted Blok 6-wijzigingen aanwezig voor begeleidingsnotities (`app/planning/[momentId]/page.tsx`, `app/lijsten/[lijstId]/page.tsx`, `app/globals.css`, `src/lib/begeleidingsnotities/items.ts`, `tests/integration/begeleidingsnotities.detail.test.tsx`). Die zijn als actuele projectstatus meegenomen, maar niet gecommit.

## 2. Bronnen en uitgevoerde controles

Gelezen of geinspecteerd:

| Bron | Controle |
| --- | --- |
| `docs/source/` | UX-blauwdruk, functionele decompositie, gebruikersflows, rechtenmodel, categoriecatalogus, MVP-scope en projectplanning via docx-tekstextractie. |
| `docs/architecture/` | RLS-plan, logisch schema, seeddata/RLS-testscenario's en Codex-bouwpakket via docx-tekstextractie. |
| `docs/audits/autonomous-project-audit-v0.1.md` | Oude nulmeting vergeleken met huidige projectstatus. |
| `docs/audits/stability-cleanup-round-v0.1.md` | Voorstelworkflow/RLS cleanup verwerkt. |
| `docs/audits/testing-foundation-v0.1.md` | Testbasis vergeleken met huidige tests. |
| `app/` | Routes en detailpagina's voor kernmodules gescand. |
| `src/lib/` | Datahelpers, acties, profielcontext, profielswitch, support, voorstellen en begeleidingsnotities gescand. |
| `supabase/migrations/` | Schema, enums, RLS, seed/resetmigraties en latere hardeningmigraties gescand. |
| `supabase/seed/` | Seedscenario's en oudere seedcomments gescand. |
| `tests/` | Vitest-integratie/unit-tests, fixtures en README-status gescand. |

Uitgevoerde commando's:

| Commando | Resultaat |
| --- | --- |
| `npm.cmd run typecheck` | Geslaagd. |
| `npm.cmd run lint` | Geslaagd. |
| `npm.cmd test` | Geslaagd: 9 testbestanden, 78 tests. |
| `npx.cmd supabase db query --help` | Geslaagd; read-only querymogelijkheid bevestigd. |
| `npx.cmd supabase --version` | Geslaagd; CLI `2.103.0`, update beschikbaar naar `2.105.0`. |
| Enkele `npx.cmd supabase db query --linked --output json ...` queries | Deels geslaagd, deels timeout via Management API. Geslaagde queries zijn hieronder gebruikt; timeouts zijn als onzekerheid genoteerd. |

Niet uitgevoerd:

| Niet uitgevoerd | Reden |
| --- | --- |
| Migraties | Expliciet buiten scope. |
| Codewijzigingen buiten dit document | Expliciet buiten scope. |
| Commits | Expliciet buiten scope. |
| Volledige browsertest | Deze opdracht vraagt om herijking en planning; browserflows worden aanbevolen als volgende ronde. |
| `npm.cmd run build` | Niet opnieuw nodig voor deze audit; de lichte kwaliteitschecks en tests zijn wel gedraaid. |

## 3. Implementatiestatus

| Onderdeel | Status | Beoordeling | Opmerkingen |
| --- | --- | --- | --- |
| Profielen | Aanwezig en functioneel bruikbaar | `functioneel bruikbaar` | Persoon/Profiel-scheiding zit in schema, contexthelper en UI. Ledenlijst/detail gebruikt RLS-zichtbare profielen. |
| Profielswitch | Aanwezig en functioneel bruikbaar | `functioneel bruikbaar` | Header onderscheidt eigen/ingelogd profiel en bekeken profiel. Wissel triggert refresh op kernpagina's. |
| Mijn dag | Aanwezig en functioneel bruikbaar, maar deels | `deels aanwezig` | Persoonlijke momenten, voorstellen, rolbezettingen, taken en gerichte aandacht zijn afgedekt. Nog geen volledige persoonlijke afspraken/activiteiten-creatie. |
| Planning | Aanwezig en functioneel bruikbaar, maar deels | `deels aanwezig` | Datum-, categorie- en status/relevantie-filters bestaan. Zichtbare groepsfilter is terecht verwijderd; RLS/groepcontext blijft leidend. Geen tags. |
| Momenten | Aanwezig en functioneel bruikbaar | `deels aanwezig` | Overzicht/detail, deelname, afmelden, voorstelacties en rolclaims werken. Momentcreatie/beheer ontbreekt. |
| Voorstellen | Aanwezig en functioneel bruikbaar voor momenten | `deels aanwezig` | Momentvoorstellen zijn gehard via RPC en verschijnen als momentstatus/actie. Enum bevat ook taak/doel/document/persoonlijk_moment, maar die flows zijn niet uitgewerkt. |
| Rollen | Aanwezig en functioneel bruikbaar | `deels aanwezig` | Rollenpalet en claim/vrijgave bestaan. Beheer/rolconfiguratie per categorie is nog niet functioneel. |
| Lijsten | Aanwezig en functioneel bruikbaar | `deels aanwezig` | Overzicht/detail en gekoppelde taken werken. Lijstcreatie/beheer ontbreekt. |
| Taken | Aanwezig en functioneel bruikbaar | `deels aanwezig` | Claim, vrijgave, afvinken en heropenen bestaan. Taakvoorstellen/overdracht zijn beperkt of niet uitgewerkt in UI. |
| Tijdlijn | Aanwezig en functioneel bruikbaar | `deels aanwezig` | Combineert berichten, signalen, voorstellen en supportvragen. Geen chat, geen aparte inbox. Notificatiestatus/read-state is nog beperkt. |
| Support | Aanwezig en functioneel bruikbaar | `functioneel bruikbaar` | Support loopt via Tijdlijn, met vraag, reacties, requester opgelost/kan sluiten, support afhandeling en tests. |
| Documenten | Aanwezig en functioneel bruikbaar als leeslaag | `deels aanwezig` | Documenten zijn informatief en gekoppeld aan groepen/context. Geen documentcreatie/publicatiebeheer. Begeleidingsnotities lekken niet via Documenten. |
| Doelen | Aanwezig maar beperkt bruikbaar | `technisch aanwezig maar functioneel onvolledig` | Overzicht/detail en koppelingen bestaan. Acceptatie/voorstel/voortgangsflow ontbreekt. |
| Gasttoegang | Aanwezig en getest | `functioneel bruikbaar, met blijvende RLS-aandacht` | Guest guard/RLS-hardening en tests bestaan. Realistische browserdata is beperkt maar bruikbaar. |
| Begeleidingsnotities | Aanwezig, RLS ontworpen/geimplementeerd, UI in detailcontext aanwezig | `deels aanwezig` | RLS en minimale moment/lijst UI zijn aanwezig in werkboom. Mist seeddata, browsertest, taakcontext-UI en mini-audit na implementatie. |
| Beheer | Minimaal aanwezig | `technisch aanwezig maar nog niet bruikbaar als productiebeheer` | `/beheer`, dev-login en health bestaan. Geen echte beheerflows voor categorieen, personen, groepen, momenten, documenten. |
| Categoriegedrag | Schema aanwezig, UI beperkt | `technisch aanwezig maar nog niet bruikbaar als gedragslaag` | Categorieen/configuraties bestaan en worden gefilterd/getoond, maar sturen velden, acties, statussen en rollen nog nauwelijks. |

## 4. Teststatus

Actuele testbasis:

| Laag | Status | Bevinding |
| --- | --- | --- |
| Vitest unit/integratie | Aanwezig | 9 testbestanden, 78 tests, groen. |
| Testing Library componenttests | Aanwezig | Header/profielswitch, Mijn dag, Planning, Tijdlijn/support, gasttoegang, begeleidingsnotities. |
| Playwright config | Aanwezig | `test:e2e` script bestaat, maar `tests/e2e` bevat alleen README. |
| RLS-tests | Ontbreekt | `tests/rls` en `supabase/tests` zijn placeholders. |
| Browserregressies | Ontbreekt als automatisering | Handmatige checks zijn in eerdere rondes gedaan, maar niet reproduceerbaar vastgelegd. |
| Testfixtures | Aanwezig maar klein | `tests/fixtures/samzo.ts` bevat basiscontexten, vooral Sam/Bas/Milan. |
| Testdocumentatie | Deels verouderd | `tests/README.md`, `tests/e2e/README.md`, `tests/rls/README.md` noemen nog placeholders alsof er geen teststack is. |

Gedekte regressies:

| Gebied | Dekking |
| --- | --- |
| Profielcontext/profielswitch | Eigen profiel default, selector, bekeken profiel label, medewerker toegang, gastcontext, geen `auth_user_id` in UI. |
| Voorstellen | Accept/reject via RPC op helperniveau, veilige foutmelding. |
| Mijn dag | Lege staat, deelname, voorstel als momentkaart, geen duplicaten, geweigerd voorstel niet actief, rolprioriteit, taken, gerichte aandacht, profielswitch refresh. |
| Planning | Laden, geen groepsfilter, datum/categorie/status, lege staat, reset, kaartlinks, profielswitch refresh, geen tagfilter/internals. |
| Tijdlijn/support | Voorstelknoppen, supportvraag aanmaken, support/requester reacties, opgelost/sluiten, supportperspectief versus bekeken profiel, geen interne IDs. |
| Gasttoegang | Mijn dag, Planning, Documenten, Tijdlijn/support, Leden, geen interne accountvelden. |
| Begeleidingsnotities | Moment/lijst blok, beheeracties, member read-only/geen bewerkacties, create, profielwissel op lijstdetail. |

Ontbrekende kritieke tests:

| Gat | Waarom belangrijk |
| --- | --- |
| Uitvoerbare RLS-tests per rol/profiel | RLS is de echte beveiligingslaag; mocks bewijzen geen database-afdwinging. |
| Playwright login/browser smoke tests | Belangrijkste regressies zijn UI + Supabase + auth + RLS samen. |
| Resetbare browsertestdata | Accept/reject/close/claim muteren data en maken latere tests onbetrouwbaar. |
| Categoriegedragtests | Categorieconfiguratie moet gedrag sturen, maar dat gedrag bestaat nog nauwelijks. |
| Beheer-/creatieflowtests | Momenten, lijsten, documenten, doelen en categorieen zijn vooral seed-gedreven. |
| Doelacceptatie/RLS-tests | Doelen zijn zichtbaar, maar persoonlijke doelacceptaties zijn nog niet functioneel bewezen. |
| Begeleidingsnotitie RLS-tests | Privacygevoelig; UI-tests zijn niet genoeg. |

## 5. Testdata-audit

Actuele testdata-observaties uit migraties en geslaagde read-only queries:

| Scenario | Status | Bevinding |
| --- | --- | --- |
| Individuele Mijn-dag-items | Voldoende voor huidige tests | Seed bevat deelname-, voorstel-, taak-, rol- en aandachtsscenario's rond 4-10 juni 2026. |
| Persoonlijke afspraken | Onvoldoende/impliciet | Enum bevat `persoonlijk_moment`, maar er is geen duidelijke persoonlijke afspraakflow of realistische browserdata voor persoonlijke afspraken. |
| Persoonlijke activiteiten | Deels aanwezig | Sam heeft persoonlijke/gekoppelde deelname- en taakscenario's, maar activiteitcreatie ontbreekt. |
| Clientspecifieke momenten | Deels aanwezig | Er zijn profielspecifieke zichtbaarheidsgevallen zoals "Alleen Milan actief"; echte client/begeleider casuistiek is beperkt. |
| Begeleider -> client voorstellen | Deels aanwezig | Voorstellen voor Sam vanuit Bas/testdata bestaan; specifieke Milan/Sanne als begeleider naar client is beperkt. |
| Gastscenario's | Voldoende voor basis | Gijs Gast, gastgroep en gasttoegankelijke momenten bestaan; gasttests zijn aanwezig. |
| Begeleidingsnotities | Onvoldoende | Schema/RLS/UI/tests bestaan, maar actuele testdata voor browserchecks ontbreekt of is niet betrouwbaar vastgesteld. |
| Profieltoegangscenario's | Voldoende voor basis | Migrations bevatten profieltoegang voor Bas/Milan/Sanne scenario's; tests dekken selector en toegankelijke profielen. |
| Meerdere profielen per persoon | Deels aanwezig | Er zijn meerdere toegankelijke profielen via `profieltoegangen`. Een persoon met meerdere eigen profielen is niet duidelijk als aparte scenarioseed aanwezig. |
| Supportvragen | Voldoende voor huidige tests | Geslaagde query toont supportvragen in `actie_nodig` en `gesloten`; supportreacties bestaan. |
| Voorstellen reset | Deels aanwezig | Resetmigratie bestaat voor een subset, maar browserregressie vraagt bredere, herhaalbare reset per flow. |

Read-only databasechecks:

| Query | Resultaat |
| --- | --- |
| Voorstellen per type/status | `deelname_aan_moment`: 2 open, 3 geaccepteerd, 2 geweigerd; `uitnodiging_moment`: 2 geaccepteerd. |
| Supportvraagstatussen | 1 `actie_nodig`, 2 `gesloten`. |
| Momentenoverzicht | 15 momenten gevonden in queryresultaat, waaronder gasttoegankelijke momenten op 5, 6, 7 en 8 juni 2026. |
| Brede tellingen/profieltoegang/begeleidingsnotities | Supabase Management API timeouts bij parallelle queries; exacte actuele tellingen onzeker. |

Testdata die eerst toegevoegd of hersteld moet worden:

| Prioriteit | Testdata | Doel |
| --- | --- | --- |
| Hoog | Resetbare browsertestdata per flow | Accept/reject, support sluiten, rol claimen en taak afvinken moeten herhaalbaar blijven. |
| Hoog | Begeleidingsnotitie seeddata | Bas/Sanne/Milan beheer, Sam read-only via expliciete momentrol indien gewenst, Gijs geen toegang. |
| Hoog | RLS-negatiefcases | Onverwante gebruiker, gast, gewone lid, support in bekeken profielcontext. |
| Middel | Persoonlijke afspraak/persoonlijk moment | Nodig voordat Mijn dag verder als persoonlijke werkelijkheid wordt uitgebreid. |
| Middel | Begeleider -> client voorstelcases | Milan/Sanne stelt iets voor aan Sam, met proposal-only handelen vanuit ander profielperspectief. |
| Middel | Doelacceptatie/onder-de-aandacht | Nodig voordat doelen vanuit Mijn dag/Tijdlijn verder worden gebouwd. |
| Middel | Categoriegedrag fixturepakket | Moment/lijst/document/doel categorieen met verschillende gedragconfiguraties. |

## 6. Risicoanalyse

Grootste functionele risico's:

| Risico | Impact |
| --- | --- |
| Categoriegedrag is nog vooral data, geen gedrag | Een kernprincipe uit de docs blijft daardoor onzichtbaar in de app. |
| Beheer- en creatieflows ontbreken | De app werkt met seeddata, maar is nog beperkt zelfstandig bruikbaar. |
| Doelen zijn leesbaar maar niet als persoonlijke regieflow | Doelen kunnen niet echt voorgesteld/geaccepteerd/onder aandacht gezet worden vanuit de UI. |
| Persoonlijk moment/persoonlijke afspraak ontbreekt als echte flow | Mijn dag blijft vooral afgeleid uit planning/deelnames/taken. |

Grootste UX-risico's:

| Risico | Impact |
| --- | --- |
| Te veel modules zijn read-only of seed-afhankelijk | Browsergebruik voelt snel als demo in plaats van werkapp. |
| Tijdlijn kan aandachtstroom blijven zonder read-state | Gebruiker kan moeilijk zien wat nieuw/afgehandeld is buiten supportstatus. |
| Begeleidingsnotities zijn privacygevoelig | UI moet zeer duidelijk intern/contextgebonden blijven zonder document-associatie. |
| Beheer/dev-login blijft zichtbaar als dagelijks onderdeel | Kan verwarring geven tussen dev-hulpmiddelen en echte beheerfunctionaliteit. |

Grootste RLS-risico's:

| Risico | Impact |
| --- | --- |
| Geen automatische RLS-tests | Regressies in policies worden niet vroeg gevonden. |
| Profielswitch kan UI-matig werken terwijl RLS-grenzen elders ontbreken | Alleen browsermocks zijn onvoldoende bewijs. |
| Begeleidingsnotities zijn nieuw en privacykritisch | Vereist positieve en negatieve RLS-tests voor beheer, medewerker, rol-read-only, lid en gast. |
| Support queue versus bekeken profielcontext | Al getest in UI, maar RLS-negatiefcases ontbreken. |

Grootste testgaten:

| Gat | Impact |
| --- | --- |
| Geen Playwright auth fixture zonder opgeslagen wachtwoorden | Handmatige regressies blijven kwetsbaar. |
| Geen database reset per browserflow | Tests worden volgorde-afhankelijk. |
| Geen pgTAP/SQL/RLS testlaag | Policies blijven vooral handmatig beoordeeld. |
| Test README's verouderd | Nieuwe rondes kunnen verkeerde aannames doen over teststatus. |

## 7. Nieuw bouwvoorstel

Plan niet verder dan 4 blokken. Dit vervangt de oude slicevolgorde als actuele werkroute.

### Blok A - Testdata en RLS-testbasis

| Veld | Voorstel |
| --- | --- |
| Doel | Maak regressies herhaalbaar en bewijs RLS op databaseniveau. |
| Benodigde testdata | Resetbare scenario's voor voorstellen, support, rolclaims, taken, gast, profieltoegang en begeleidingsnotities. |
| Benodigde tests | Eerste RLS-tests voor voorstellen, supportvragen, documenten/gast, profielswitch en begeleidingsnotities. |
| Audit | Mini-audit: RLS-testbasis GO/FIX. |
| Verwachte output | `tests/rls` of Supabase SQL-testaanpak, resetstrategie, bijgewerkte testdocumentatie, groene `npm test` plus RLS-command waar mogelijk. |

### Blok B - Begeleidingsnotities afronden en auditen

| Veld | Voorstel |
| --- | --- |
| Doel | Maak Blok 6 echt af: privacygevoelige notities bruikbaar in toegestane detailcontext, niet in Documenten/Tijdlijn. |
| Benodigde testdata | Contextnoten voor moment en lijst; optioneel taak; Bas/Sanne/Milan beheer; Sam read-only via expliciete rol; Gijs geen toegang. |
| Benodigde tests | RLS-tests en browser/integratietests voor zichtbaarheid, create/edit/archive, read-only roltoegang en geen Documenten-lek. |
| Audit | Mini-audit Blok 6 - Begeleidingsnotities. |
| Verwachte output | Bevestigde UI/RLS/testdata, geen algemene notesmodule, geen categorie, geen documentkoppeling. |

### Blok C - Categoriegedrag MVP-light

| Veld | Voorstel |
| --- | --- |
| Doel | Laat categorieconfiguratie beperkt maar echt gedrag sturen, zonder categorieen tot rechtenlaag te maken. |
| Benodigde testdata | Categorieen met verschillende actievelden/statussen/rollen voor moment, lijst, document, doel. |
| Benodigde tests | Unittests voor config mapping; integratietests voor zichtbaar gedrag op Planning/Moment/Lijst; regressie dat tags geen gedrag/rechten bepalen. |
| Audit | Mini-audit categoriegedrag. |
| Verwachte output | Kleine helper/API voor categoriegedrag, UI gebruikt config voor labels/acties waar schema-safe, documentatie van wat nog deferred blijft. |

### Blok D - Basisbeheer en creatieflows

| Veld | Voorstel |
| --- | --- |
| Doel | Maak de app minder seed-afhankelijk door smalle beheer/creatieflows te bouwen. |
| Benodigde testdata | Beheerderscenario's voor Bas/Sanne, groep/categorie/moment/lijst/document basisdata. |
| Benodigde tests | RLS en UI-tests voor wie mag maken/wijzigen/archiveren; browser smoke voor nieuw moment of nieuwe lijst. |
| Audit | Grotere audit na eerste beheerflow, omdat dit meerdere modules raakt. |
| Verwachte output | Eerste productieachtige beheerflow, waarschijnlijk moment of lijst eerst, met RLS en rustige UX. |

## 8. Aanbevolen eerstvolgende Codex-opdracht

```text
Je werkt in het SAM&ZO-project.

Doel:
Zet een herhaalbare testdata- en RLS-testbasis op voordat nieuwe functionaliteit wordt gebouwd.

Gebruik:
- docs/audits/project-herijking-v0.1.md
- docs/source/
- docs/architecture/
- bestaande migraties
- bestaande tests

Taken:
1. Inspecteer huidige testdata en RLS-testmogelijkheden.
2. Werk verouderde test-README's bij zodat ze de actuele Vitest/Playwright/RLS-status beschrijven.
3. Ontwerp de kleinste veilige resetstrategie voor development browserflows.
4. Voeg alleen testdata/reset toe als dat nodig is en maak daarvoor nieuwe migraties, geen bestaande migraties wijzigen.
5. Voeg eerste uitvoerbare RLS-tests of een concreet uitvoerbaar RLS-testscript toe voor:
   - voorstellen beantwoorden;
   - supportvraag zichtbaarheid/updates;
   - gast ziet alleen gastcontext;
   - begeleidingsnotities zichtbaar/bewerkbaar per rol/context.
6. Run typecheck, lint, test en de gekozen RLS-testcommand.
7. Maak een kort auditdocument met resultaten.

Belangrijk:
- Bouw geen nieuwe UI.
- Geen service_role in frontend.
- Geen RLS verzwakken.
- Geen commit.
```

## 9. Aanbevolen eerstvolgende audit

Mini-audit: `RLS-testbasis en resetbare browserdata v0.1`.

Controleer daarin:

| Controle | Vraag |
| --- | --- |
| RLS-tests | Zijn de eerste positieve en negatieve policycases uitvoerbaar? |
| Resetdata | Kan een browserflow meerdere keren achter elkaar draaien zonder handmatig databaseherstel? |
| Testdocs | Kloppen README's en scripts met de echte teststack? |
| Security | Wordt geen `service_role` gebruikt en worden geen wachtwoorden opgeslagen? |
| Browserbasis | Is Playwright klaar voor veilige login zonder credentials in repo? |

## 10. Aanbevolen eerstvolgende testdata-uitbreiding

Eerst toevoegen of resetbaar maken:

| Testdata | Waarom eerst |
| --- | --- |
| Begeleidingsnotities per context/rol | Blok 6 is privacygevoelig en kan niet alleen met mocks worden vertrouwd. |
| Resetbare open voorstellen | Accept/reject browserflows muteren data en moeten herhaalbaar zijn. |
| Supportvraag met response per status | Support sluiten/opnieuw aandacht vragen moet herhaalbaar getest worden. |
| Gast versus intern document/moment | Gasttoegang is security-kritiek en moet in browser + RLS bewijsbaar blijven. |
| Persoonlijk moment/persoonlijke afspraak | Nodig voordat Mijn dag verder wordt uitgebreid als persoonlijke werkelijkheid. |

