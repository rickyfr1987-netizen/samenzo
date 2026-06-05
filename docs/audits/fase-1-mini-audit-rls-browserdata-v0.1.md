# SAM&ZO Fase 1 mini-audit RLS-testbasis en resetbare browserdata v0.1

## 1. Auditdatum

5 juni 2026.

## 2. Scope

Deze mini-audit beoordeelt of Fase 1, de testdata- en RLS-basisfase,
voldoende is afgerond om Fase 2 te starten als analysefase. Deze audit bouwt
geen nieuwe functionaliteit, policies, RLS-tests, browserflows of Fase 2-code.

## 3. Gelezen bronnen

| Bron | Gebruik |
| --- | --- |
| `docs/audits/fase-1-rls-bewijsmatrix-v0.1.md` | RLS-matrix, CI-route en risico's tot en met Stap 1G. |
| `docs/testing/browser-testdata-v0.1.md` | Browserdata-catalogus, runtime-authconfig en resetstrategie. |
| `docs/testing/test-strategy-v0.1.md` | Overkoepelende teststrategie en Fase 1-status. |
| `supabase/tests/README.md` en `tests/rls/README.md` | RLS-testuitleg en bewezen domeinen. |
| `tests/e2e/README.md` en `tests/fixtures/README.md` | Playwright- en fixtureafspraken. |
| `.github/workflows/samzo-rls-ci.yml` | CI-runtimebewijs voor typecheck, lint, Vitest en Supabase RLS. |
| `supabase/tests/database/*.test.sql` | Uitvoerbare pgTAP/RLS-bewijzen. |
| `playwright.config.ts` | Playwright-config, artifactbeleid en webserverroute. |
| `tests/e2e/fixtures/auth.ts` | Runtime-only authfixture en veilige skip. |
| `tests/e2e/mijn-dag-auth-smoke.spec.ts` | Minimale auth-/profielcontext-rooktest. |

## 4. Samenvatting

Fase 1 heeft de gevraagde basis opgeleverd:

- een leidende migratie-seedlijn met vijf fictieve kernprofielen;
- een reproduceerbare RLS-testlaag via pgTAP;
- een GitHub Actions-route die lokale Supabase start/reset en RLS-tests draait;
- minimale privacykritische RLS-dekking voor documenten, voorstellen,
  gastcontext, begeleidingsnotities en supportvragen;
- een veilige Playwright-authbasis met runtime-only credentials;
- een browserdata-catalogus en resetstrategie voor toekomstige browserflows.

De auditconclusie is: **Fase 1 voldoende afgerond onder voorwaarden - GO voor
Fase 2 analyse, met expliciete risico's**.

Fase 2 mag starten als analyse van "Mijn dag als persoonlijke werkelijkheid".
Fase 2 mag nog geen functionaliteit bouwen zonder aparte GO.

## 5. RLS-bewijs

| Domein | Auditbeoordeling |
| --- | --- |
| Documenten | Voldoende voor Fase 1. Positieve en negatieve zichtbaarheid zijn bewezen voor medewerker/bewoner. Groep- en contextvarianten blijven later. |
| Voorstellen | Voldoende voor Fase 1. Persoonlijke regie is bewezen met positieve/negatieve select en RPC-statusactie. Volledige voorstelmatrix blijft later. |
| Gastcontext | Voldoende voor Fase 1. Gijs Gast ziet expliciete gastcontext en eigen deelname, maar geen bewonersmoment of intern medewerkersdocument. |
| Begeleidingsnotities | Voldoende als minimale privacykritische basis. Insert/select in toegestane context en afscherming voor Sam/Gijs zijn bewezen; functionele flows blijven later. |
| Supportvragen | Voldoende als minimale privacykritische basis. Requester/support/negatief gastprofiel zijn bewezen; supportreacties en sluitflow blijven later. |

De RLS-tests zijn reproduceerbaar omdat ze tijdelijke lokale Auth-users koppelen
binnen rollback-transacties, vaste migratie-seeddata gebruiken en via
`npm run test:rls` in CI draaien. De tests raken geen remote Supabase-project en
gebruiken geen service-role om gewoon gebruikersgedrag te bewijzen.

Niet bewezen in Fase 1:

- volledige documentenmatrix voor groepen, gekoppelde items en mutaties;
- volledige voorstellenmatrix voor accepteren, intrekken, verlopen en
  beheer/supportcontexten;
- gastmutaties en bredere gastscenario's;
- volledige begeleidingsnotitieflows;
- supportreacties en sluiting na supportantwoord;
- `doelacceptaties`-policygedrag.

Deze beperkingen zijn acceptabel voor een doorstart naar Fase 2 analyse, zolang
ze expliciet als risico's blijven staan en niet stilzwijgend als afgerond
worden behandeld.

## 6. Browserdata-bewijs

De browserlaag is voldoende voorbereid voor Fase 1:

- de vijf kernprofielen Bas, Sanne, Milan, Sam en Gijs zijn gecatalogiseerd;
- Sam Bewoner is aangewezen als eerste rooktestprofiel;
- Playwright gebruikt runtime-only variabelen `SAMZO_E2E_EMAIL`,
  `SAMZO_E2E_PASSWORD` en `SAMZO_E2E_PROFILE_NAME`;
- het gedeelde lokale testwachtwoord wordt niet opgeslagen;
- de authfixture skipt veilig als runtime-authconfig ontbreekt;
- screenshots, video en traces staan standaard uit;
- er wordt geen storage state in Git bewaard.

Nog niet bewezen:

- de echte Playwright-login-rooktest is nog niet met runtime-auth uitgevoerd;
- muterende browserflows hebben nog geen eigen resetbare testdata;
- browserflows voor Planning, support, gastcontext en begeleidingsnotities zijn
  bewust niet toegevoegd.

Voor Fase 1 is dit voldoende, omdat de browserlaag alleen een veilige basis en
resetstrategie hoefde te leveren. Muterende browserflows mogen pas later worden
toegevoegd wanneer hun testdata vooraf resetbaar is.

## 7. CI-bewijs

`SAM&ZO RLS CI` is voldoende als leidende runtime-proof-route zolang
Shadow/Docker lokaal onbetrouwbaar blijft.

De workflow:

- draait op `ubuntu-latest`;
- gebruikt Node 24;
- installeert npm dependencies;
- installeert Supabase CLI `2.103.0`;
- draait `npm run typecheck`, `npm run lint` en `npm run test`;
- start lokale Supabase;
- voert `supabase db reset --local` uit;
- controleert seed- en RLS-aannames;
- draait `npm run test:rls`;
- draait `supabase db lint --local --fail-on none` non-blocking;
- redigeert Supabase-output die keys, tokens of database-URLs kan bevatten;
- gebruikt geen Supabase secrets en raakt geen remote project.

Bekende beperking: GitHub Actions toont nog een niet-blokkerende waarschuwing
over Node.js 20-actions voor gebruikte actions. Dit is onderhoud, geen
blokkerend Fase 1-risico.

Laatste relevante groene CI-basis voor deze audit: branch
`fase-1b-ci-rls-proof`, commit `e4e6f47`, workflow `SAM&ZO RLS CI`, resultaat
`success`.

## 8. Open risico's

| Classificatie | Risico | Beoordeling |
| --- | --- | --- |
| Niet-blokkerend maar verplicht volgen | `doelacceptaties` heeft RLS aan, maar geen actuele policy. | Veilig afgesloten voor normale gebruikers, maar functioneel onvolledig. Moet expliciet terugkomen wanneer doelen/acceptaties functioneel belangrijk worden. |
| Niet-blokkerend maar verplicht volgen | Echte Playwright-login-rooktest is nog niet runtime uitgevoerd. | Basis is veilig, maar runtime-login moet later met lokale envvars worden bewezen. |
| Niet-blokkerend maar verplicht volgen | Muterende browserflows hebben nog geen eigen resetdata. | Geen muterende browserflows toevoegen voordat resetbare scenario's bestaan. |
| Niet-blokkerend maar verplicht volgen | Toekomstig gedateerde migraties. | CI bewijst de keten, maar migratiebeheer blijft verwarringsrisico. Niet hernoemen zonder aparte GO. |
| Later onderhoud | Shadow/Docker lokaal onbetrouwbaar. | GitHub Actions is leidend; lokale infrastructuur kan apart worden hersteld. |
| Later onderhoud | Node.js 20-actions waarschuwing. | Niet blokkerend, later actions/runnerbeleid nalopen. |
| Niet-blokkerend maar verplicht volgen | Begeleidingsnotities functioneel niet afgerond. | Minimale privacy-RLS is bewezen; volledige flows later. |
| Niet-blokkerend maar verplicht volgen | Supportvragen sluitflow/supportreactie niet volledig bewezen. | Minimale RLS is bewezen; volledige supportlevenscyclus later zonder ticketmodule. |
| Blokkerend voor bouw, niet voor analyse | Fase 2 mag niet direct bouwen. | Fase 2 moet starten met analyse; bouw vraagt nieuwe GO. |

## 9. Fasebesluit

Advies: **Fase 1 voldoende afgerond onder voorwaarden - GO voor Fase 2 analyse,
met expliciete risico's**.

Voorwaarden:

1. Fase 2 start met analyse van "Mijn dag als persoonlijke werkelijkheid".
2. Er wordt geen Fase 2-functionaliteit gebouwd zonder aparte GO.
3. RLS-bewijs blijft via pgTAP/GitHub Actions lopen, niet via Playwright.
4. Muterende browserflows worden pas toegevoegd na expliciete resetbare
   testdata.
5. De open risico's uit deze audit blijven zichtbaar in de Fase 2-planning.

## 10. Aanbevolen volgende stap

Fase 2 Stap 2A: analyseer "Mijn dag als persoonlijke werkelijkheid".

Doel:

- inventariseer functionele verwachtingen voor Mijn dag;
- koppel die aan bestaande data, RLS-bewijs en browserdata-afspraken;
- bepaal welke user journeys later gebouwd of getest mogen worden;
- lever nog geen Fase 2-functionaliteit op zonder aparte GO.

Aanbevolen model: GPT-5.5 Codex.
Reasoningniveau: extra hoog.
Browsertesten: nee.
Het gedeelde lokale testwachtwoord is niet nodig.
