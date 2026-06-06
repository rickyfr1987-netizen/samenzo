# SAM&ZO Fase 1 RLS-bewijsmatrix v0.1

## 1. Doel

Dit document consolideert de Fase 1 RLS-basis tot en met Stap 1F. Het is een
beslisdocument voor het afronden van Fase 1 en start geen nieuwe RLS-domeinen,
policies, browserflows of Fase 2-functionaliteit.

Fase 1 draait om testdata, reproduceerbare RLS-tests en een gecontroleerde
route naar resetbare browserflows. De huidige RLS-runtime is bewezen via
GitHub Actions, niet via de Shadow cloud-pc.

## 2. CI-bewijsroute

| Onderdeel | Status |
| --- | --- |
| Workflow | `SAM&ZO RLS CI` |
| Branches | `fase-1b-ci-rls-proof`, `fase-2-personal-items-green-base` |
| Laatste bewezen commit | `3dec1fe` op `fase-1b-ci-rls-proof`; nieuwe run op `fase-2-personal-items-green-base` nog te bevestigen na workflow-triggerfix |
| Laatste bewezen run | `27015359190` op `fase-1b-ci-rls-proof`; nieuwe run op `fase-2-personal-items-green-base` nog te bevestigen |
| Resultaat | Laatste historische run `success`; stabiele vervolgbranch wacht op nieuwe CI-bevestiging |
| Runtime | GitHub Actions Linux runner |
| Supabase-route | `supabase start`, `supabase db reset --local`, `npm run test:rls` |
| Seed/RLS-check | Controle op vijf leidende seed-personen, legacy seed-personen en `documenten` RLS |
| Secrets | Niet nodig |
| Remote Supabase | Niet geraakt |
| Browsertests | Niet onderdeel van deze workflow |

De workflow draait daarnaast `npm run typecheck`, `npm run lint` en
`npm run test`. `supabase db lint --local --fail-on none` draait non-blocking.
GitHub Actions toont nog een niet-blokkerende waarschuwing over Node.js
20-actions voor gebruikte actions. De workflow zelf gebruikt Node 24.

Sinds Fase 0C triggert dezelfde workflow ook op push en pull requests voor
`fase-2-personal-items-green-base`, zodat de stabiele vervolgbranch dezelfde
lokale Supabase/RLS-bewijsroute krijgt als de oorspronkelijke
`fase-1b-ci-rls-proof`-branch. De eerste groene run op deze stabiele branch
moet nog als nieuw runtimebewijs worden vastgelegd.

De Shadow cloud-pc heeft op dit moment geen gezonde Docker/Supabase-runtime.
Daarom is GitHub Actions de objectieve runtime-proof-route voor RLS.

## 3. RLS-bewijsmatrix

| Domein | Testbestand | Positieve cases | Negatieve cases | Mutatie-/RPC-cases | Seeddata-afhankelijkheid | Bewezen SAM&ZO-principes | Nog niet bewezen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Documenten | `supabase/tests/database/documents_rls.test.sql` | Milan ziet het gepubliceerde medewerkersdocument. | Sam ziet het medewerkersdocument niet. | Geen mutatiecase. | Vijf kernpersonen, geen legacy acht-profielen seedset, document `60000000-0000-4000-8000-000000000002`, policy `documenten_select_context_gepubliceerd_of_beheer`. | Gepubliceerde documenten blijven gebonden aan groep/context; gewone bewoners krijgen geen intern medewerkersdocument. | Documentzichtbaarheid via meerdere groepen/contexten, gekoppelde items, documentmutaties en archivering. |
| Voorstellen | `supabase/tests/database/voorstellen_rls.test.sql` | Sam ziet zijn eigen open voorstel. Sam kan een eigen open voorstel via RPC weigeren. | Gijs ziet Sams voorstel niet. Bas kan Sams voorstel niet namens Sam beantwoorden. | `beantwoord_moment_voorstel` positief voor Sam en negatief voor Bas. | Open voorstellen `45500000-0000-4000-8000-000000000001` en `45500000-0000-4000-8000-000000000003`, policies `voorstellen_select_betrokken_of_beheer` en `voorstellen_update_status_bij_ontvanger`. | Persoonlijke regie: alleen het ontvangende profiel beslist over eigen voorstelstatus. Niet-betrokken profielen krijgen geen zicht. | Volledige voorstelmatrix voor intrekken, accepteren, verlopen, support/beheer-contexten en UI-browserflow. |
| Gastcontext | `supabase/tests/database/gastcontext_rls.test.sql` | Gijs ziet een expliciet gasttoegankelijk moment en zijn eigen gastdeelname. | Gijs ziet geen bewonersmoment en geen intern medewerkersdocument. | Geen mutatiecase. | Gijs als gastprofiel, Gasten-groep, moment `47000000-0000-4000-8000-000000000005`, deelname `48200000-0000-4000-8000-000000000004`, moment `47000000-0000-4000-8000-000000000002`, document `60000000-0000-4000-8000-000000000002`. | Gasttoegang is expliciet en beperkt; eigen deelname is zichtbaar; interne/bewonersinformatie blijft afgeschermd. | Gastmutaties, bredere gastmomentmatrix, gecombineerde groepscontexten en browserbewijs. |
| Begeleidingsnotities | `supabase/tests/database/begeleidingsnotities_rls.test.sql` | Milan kan een notitie in toegestane momentcontext aanmaken en zien. | Sam ziet die notitie niet en kan geen notitie in Milans context aanmaken. Gijs ziet die notitie als gast niet. | Insert positief voor Milan; insert negatief voor Sam. | Milan-deelname `48200000-0000-4000-8000-000000000007`, moment `47000000-0000-4000-8000-000000000007`, policy `begeleidingsnotities_select_context_bound`, policy `begeleidingsnotities_insert_context_bound`. | Privacykritische notities blijven contextgebonden; niet-betrokken profielen en gasten krijgen geen toegang. | Functionele begeleidingsnotitieflows, realistische individuele contexten, archivering/update, volledige UI- en browserflows. |
| Supportvragen | `supabase/tests/database/supportvragen_rls.test.sql` | Sam ziet zijn eigen supportvraag. Sanne ziet als systeemondersteuner de supportvraag. | Gijs ziet Sams supportvraag niet. Gijs' updatepoging verandert de supportvraag niet. | Sanne zet de supportvraag naar `in_behandeling`; statuscontrole bewijst wijziging. | Supportvraag `70000000-0000-4000-8000-000000000001`, policies `supportvragen_select_context_of_support`, `supportvragen_insert_eigen_profiel_nieuw`, `supportvragen_update_support_and_requester`, `supportvragen_update_requester_close_own_with_response`. | Lichte support blijft context/support-gebonden; requester en support hebben minimale zichtbaarheid; niet-betrokken gastprofiel kan niet lezen of muteren. | Supportreacties, sluitflow na supportantwoord, volledige supportlevenscyclus en bewuste afbakening zonder ticketmodule/chatlaag. |

Alle tests koppelen tijdelijke lokale Auth-users binnen een rollback-transactie
en gebruiken geen service-role om gewoon gebruikersgedrag te bewijzen.

## 4. Open risico's

| Prioriteit | Risico | Beoordeling | Aanbevolen vervolg |
| --- | --- | --- | --- |
| Hoog | `doelacceptaties` heeft RLS aan maar geen actuele policy. | Veilig in de zin dat normale gebruikers technisch afgesloten blijven, maar functioneel onvolledig en later verwarrend. | Apart besluit nemen: policy ontwerpen of bewust buiten Fase 1 houden met expliciete auditnotitie. |
| Hoog | Playwright-authbasis en resetbare browserflows zijn nog niet versterkt. | Fase 1 mist nog browser-reproduceerbaarheid voor kernroutes. | Stap 1H voorbereiden zonder Fase 2-functionaliteit te bouwen. |
| Hoog | Fase 2 mag niet starten zonder besluit of Fase 1 voldoende is afgerond. | RLS-basis is historisch groen en de stabiele branch heeft nu dezelfde CI-trigger, maar browserdata, mini-audit en een verse stabiele-branch-run ontbreken nog. | Eerst resterende Fase 1-stappen afronden, CI-run op `fase-2-personal-items-green-base` bevestigen en mini-audit uitvoeren. |
| Hoog | Toekomstig gedateerde migraties kunnen later verwarring geven bij migratiebeheer. | De keten werkt in CI, maar datums na 4 juni 2026 blijven een ordeningsrisico. | Niet hernoemen zonder aparte GO; wel expliciet meenemen in mini-audit. |
| Gemiddeld | Begeleidingsnotities zijn RLS-minimaal bewezen maar functioneel niet afgerond. | Privacykritische basis is aanwezig, volledige flows nog niet. | Later na Fase 2 of in een aparte begeleidingsnotitie-hardeningstap uitbreiden. |
| Gemiddeld | Supportvragen zijn RLS-minimaal bewezen maar sluitflow met supportreactie is niet volledig runtime bewezen. | Minimale requester/support/grens is bewezen; volledige levenscyclus niet. | Later supportreacties en sluitflow testen zonder ticketmodule te bouwen. |
| Gemiddeld | Shadow/Docker blijft lokaal onbetrouwbaar. | Lokale Supabase-runtime is niet leidend; CI bewijst runtime. | GitHub Actions blijven gebruiken als objectieve route; lokale Docker apart herstellen als infrastructuurtaak. |
| Gemiddeld | Node.js 20-actions waarschuwing in GitHub Actions. | Niet blokkerend voor huidige groene runs, wel CI-onderhoud. | Later actions-versies of runner-env nalopen. |
| Laag | Documentatie kan achterlopen als matrix niet centraal blijft. | Nu gecentraliseerd in dit document, maar onderhoud nodig. | Bij elke nieuwe RLS-stap deze matrix bijwerken. |
| Laag | `supabase db lint --local --fail-on none` is non-blocking. | Bewuste waarschuwingenroute, geen blokkade. | Later bepalen of bepaalde lintcategorieen blokkerend mogen worden. |

## 5. Resterende Fase 1-stappen

| Stap | Doel | Scope | Niet doen |
| --- | --- | --- | --- |
| Stap 1H | Playwright-authbasis en minimale rooktest voorbereiden. | Alleen auth/resetbasis en een kleine rookroute voorbereiden, met runtime verwijzing naar het gedeelde lokale testwachtwoord indien nodig. | Geen Fase 2, geen nieuwe UI-functionaliteit, geen brede browserflows. |
| Stap 1I | Resetbare browserdata en browserflow-documentatie vastleggen. | Beschrijven hoe testdata voor browserflows resetbaar blijft en welke routes later reproduceerbaar getest worden. | Geen migratiegeschiedenis herschrijven, geen remote Supabase reset. |
| Stap 1J | Mini-audit "RLS-testbasis en resetbare browserdata". | Besluitdocument: is Fase 1 voldoende om Fase 2 te starten? | Geen nieuwe policies of domeintests tijdens de audit zelf. |

Optionele kleine cleanup voor of na Stap 1H: CI-waarschuwing rond Node.js
20-actions beoordelen. Dit is nuttig, maar blokkeert de huidige RLS-basis niet.

## 6. Advies

Stap 1G kan als afgerond gelden zodra dit document is gecommit, gepusht en de
CI-run opnieuw groen is.

Fase 1 als geheel is nog niet klaar voor afsluiting. De RLS-basis is
reproduceerbaar bewezen, maar Playwright-authbasis, resetbare browserdata en de
mini-audit ontbreken nog. Fase 2 moet wachten op minimaal Stap 1J.
