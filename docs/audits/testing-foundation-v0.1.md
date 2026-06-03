# SAM&ZO testing foundation v0.1

## 1. Samenvatting

Deze ronde heeft een eerste professionele testbasis toegevoegd zonder nieuwe
functionaliteit, UX-wijzigingen of datamodelwijzigingen.

Gekozen stack:

| Laag | Tooling |
| --- | --- |
| Unit/integratie | Vitest |
| Client component tests | Testing Library + jsdom |
| E2E-voorbereiding | Playwright |
| Supabase/RLS | Strategie vastgelegd; nog geen uitvoerbare RLS-tests toegevoegd |

## 2. Geinstalleerde tooling

Toegevoegd als dev-dependency:

| Package | Doel |
| --- | --- |
| `vitest` | Test runner voor unit- en component-integratietests. |
| `jsdom` | DOM-omgeving voor client components. |
| `@vitejs/plugin-react` | React/TSX-transformatie binnen Vitest. |
| `@testing-library/react` | Renderen en bevragen van React UI. |
| `@testing-library/jest-dom` | DOM-matchers. |
| `@testing-library/user-event` | Voor toekomstige interactietests. |
| `@playwright/test` | E2E-laag voor toekomstige browserflows. |

NPM meldde na installatie twee moderate dev-dependency kwetsbaarheden. Er is
geen automatische `npm audit fix --force` uitgevoerd, omdat dat packageversies
breed kan wijzigen.

## 3. Configuratie en scripts

Toegevoegd:

| Bestand | Inhoud |
| --- | --- |
| `vitest.config.ts` | Alias `@`, jsdom, setupfile en uitsluiting van `tests/e2e/**`. |
| `playwright.config.ts` | Playwright-config voor toekomstige browsertests met Next dev server. |
| `tests/setup/vitest.setup.ts` | Testing Library cleanup en eenvoudige `next/link` mock. |
| `tests/fixtures/samzo.ts` | Kleine fixtures voor Sam/Bas-context en datumhelpers. |

Package scripts:

| Script | Commando |
| --- | --- |
| `test` | `vitest run` |
| `test:unit` | `vitest run` |
| `test:e2e` | `playwright test` |
| `test:ci` | `npm run typecheck && npm run lint && npm run test:unit` |

## 4. Gemaakte tests

| Test | Bestand | Dekking |
| --- | --- | --- |
| Voorstel accepteren | `tests/unit/voorstellen.actions.test.ts` | Controleert RPC `beantwoord_moment_voorstel` met `antwoord: "accept"` en result mapping. |
| Voorstel weigeren | `tests/unit/voorstellen.actions.test.ts` | Controleert dezelfde RPC met `antwoord: "reject"`. |
| Voorstelactie veilige foutmelding | `tests/unit/voorstellen.actions.test.ts` | Controleert dat RLS-achtige fouten niet technisch naar de UI lekken. |
| Mijn dag voorstelweergave | `tests/integration/mijn-dag.page.test.tsx` | Open voorstel wordt getoond als momentkaart met `Voorstel: voorgesteld` en acties. |
| Tijdlijn voorstelknoppen | `tests/integration/tijdlijn.page.test.tsx` | Accept/weiger-knoppen verschijnen alleen voor het ontvangende profiel. |
| Planning laden | `tests/integration/planning.page.test.tsx` | RLS-zichtbare momenten worden getoond zonder technische foutstaat. |

## 5. Testresultaten

Uitgevoerde controles in deze ronde:

| Commando | Resultaat |
| --- | --- |
| `npm run typecheck` | Geslaagd met `tsc --noEmit`. |
| `npm run lint` | Geslaagd met `eslint .`. |
| `npm run build` | Geslaagd met Next.js 16.2.6; 13 static pages gegenereerd. |
| `npm run test` | Geslaagd met Vitest 4.1.8: 4 testbestanden, 6 tests. |

E2E:

| Commando | Status |
| --- | --- |
| `npm run test:e2e` | Niet uitgevoerd in deze ronde; Playwright is geconfigureerd maar browserflows worden als aparte vervolgstap toegevoegd. |

## 6. Mislukte tests of beperkingen

Bekende beperkingen:

| Beperking | Uitleg |
| --- | --- |
| Geen echte RLS-test | RLS vraagt om echte Supabase/Auth/Postgres-context; deze ronde legt de strategie vast maar gebruikt mocks voor frontendgrenzen. |
| Geen Playwright-flow toegevoegd | De eerste regressies zijn goedkoper en stabieler als Vitest-tests. Browserflows volgen zodra testaccounts en datareset expliciet zijn. |
| Geen datamodeltest voor dubbele deelname | De frontend/RPC-aanroep wordt getest, maar database-atomiteit moet later met RLS/integratietests tegen Supabase worden gecontroleerd. |
| NPM audit niet opgelost | Twee moderate dev-dependency kwetsbaarheden zijn gemeld, maar niet automatisch geforceerd gefixt. |

## 7. Aanbevelingen

Aanbevolen volgende stappen:

| Prioriteit | Vervolg |
| --- | --- |
| Hoog | Voeg RLS-tests toe voor `beantwoord_moment_voorstel`: ontvangend profiel mag, voorsteller/support/beheer mag niet. |
| Hoog | Voeg Playwright smoke tests toe voor `/mijn-dag`, `/tijdlijn` en `/planning` met expliciete testauth of gecontroleerde dev-login. |
| Hoog | Voeg een idempotente testdata-reset toe voor open voorstelcases voordat e2e accept/reject draait. |
| Middel | Breid componenttests uit naar Momentdetail, zodat voorstelacties op het moment zelf ook vastliggen. |
| Middel | Voeg tests toe voor documenten per groep en gast met eigen Mijn dag. |
