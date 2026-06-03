# SAM&ZO teststrategie v0.1

## Architectuur

De testbasis volgt de SAM&ZO-architectuur:

| Laag | Doel | Testvorm |
| --- | --- | --- |
| Domein-/actiehelpers | Statusovergangen, RPC-aanroepen en foutafhandeling vastleggen. | Vitest unit tests met gemockte Supabase-client. |
| Clientpagina's | Controleren dat bestaande schermen SAM&ZO-logica correct tonen. | Vitest + Testing Library in `jsdom`. |
| Browserflows | Kritieke routes en gebruikerflows door de echte Next-app klikken. | Playwright, apart van de snelle unitrun. |
| Supabase/RLS | Controleren dat policygrenzen overeenkomen met persoonlijke regie, groepen en zichtbaarheid. | Eerst plan en lint; later gerichte SQL/RLS-tests tegen lokale of linked testdatabase. |

Bronnen van waarheid:

| Bron | Gebruik |
| --- | --- |
| `docs/source/` | Functionele regels: Mijn dag persoonlijk, Planning gemeenschappelijk, voorstellen als status/actie op item. |
| `docs/architecture/` | Datamodel-, RLS- en statusrichting. |
| `docs/audits/autonomous-project-audit-v0.1.md` | Implementatiematrix en testgaten. |
| `docs/audits/stability-cleanup-round-v0.1.md` | Gehard voorstelgedrag en resterende risico's. |

## Tooling

| Tool | Waarom |
| --- | --- |
| Vitest | Past bij TypeScript/Vite-ecosysteem, snel voor unit- en component-integratietests. |
| Testing Library | Test UI zoals gebruikers die ervaren, zonder componentinternals te bevriezen. |
| `@testing-library/jest-dom` | Leesbare DOM-assertions. |
| `jsdom` | Browserachtige omgeving voor client components zonder echte browser. |
| Playwright | Beste laag voor toekomstige echte browserflows met Next.js routes. |

## Structuur

| Pad | Inhoud |
| --- | --- |
| `tests/setup/` | Vitest setup, DOM cleanup en gedeelde mocks zoals `next/link`. |
| `tests/fixtures/` | Kleine, stabiele fixtures voor SAM&ZO-profielen, context en datums. |
| `tests/unit/` | Pure unit tests en actiehelpertests. |
| `tests/integration/` | Component-integratietests met gemockte datahelpers. |
| `tests/e2e/` | Playwright browsertests. |
| `tests/rls/` | Toekomstige RLS-testscenario's of SQL-testdocumentatie. |

## Naamconventies

| Type | Conventie | Voorbeeld |
| --- | --- | --- |
| Unit | `<domein>.<onderdeel>.test.ts` | `voorstellen.actions.test.ts` |
| Component-integratie | `<route-of-flow>.page.test.tsx` | `mijn-dag.page.test.tsx` |
| E2E | `<flow>.spec.ts` | `proposal-flow.spec.ts` |
| Fixtures | Beschrijvende helpernamen | `createSamzoContext`, `currentDayIsoAt` |

## Scripts

| Script | Doel |
| --- | --- |
| `npm run test` | Snelle regressierun via Vitest. |
| `npm run test:unit` | Zelfde snelle Vitest-run, expliciet voor unit/component-integratie. |
| `npm run test:e2e` | Playwright browsertests. |
| `npm run test:ci` | Typecheck, lint en Vitest voor CI-achtige controle. |

## Nieuwe tests toevoegen

Werkwijze:

1. Kies de laag die het risico het goedkoopst afdekt.
2. Gebruik bestaande documenten en audits als functionele bron.
3. Mock Supabase alleen op modulegrenzen, niet midden in componentlogica.
4. Test gebruikerszichtbare tekst, knoppen en statuslabels met Testing Library.
5. Voeg RLS-tests pas toe tegen een expliciet gekozen lokale of linked testdatabase.
6. Houd testdata klein en herkenbaar: Sam Bewoner, Bas Beheerder, Milan Medewerker, Sanne Systeemondersteuner en Gijs Gast.

## Supabase/RLS-strategie

Voor deze ronde zijn geen databasewijzigingen nodig. De eerste RLS-testlaag moet
apart worden toegevoegd, omdat RLS alleen betrouwbaar te testen is tegen een
echte Postgres/Supabase-context met Auth-claims.

Aanbevolen volgorde:

| Stap | Inhoud |
| --- | --- |
| 1 | Supabase CLI-validatie blijven draaien: `npx supabase db lint --linked --schema public --level warning --fail-on none`. |
| 2 | Lokale Supabase-testdatabase gebruiken zodra Docker beschikbaar is. |
| 3 | RLS-scenario's vastleggen voor voorstelantwoord, documentzichtbaarheid, gastcontext en begeleidingsnotities. |
| 4 | Alleen testdata gebruiken die idempotent en development-only is. |
| 5 | Geen service-role in frontend- of browsertests gebruiken. |
